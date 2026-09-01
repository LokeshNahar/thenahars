# Security fix: public/private field split

## What was wrong

An internal audit (reproduced live against `thenahars-dev`, not just read from
source) found that `firestore.rules` had `allow read: if true` on the `people`
collection — meaning anyone, with no login at all, could pull every family
member's full name, phone, email, date of birth, marriage date, location,
profession, qualification, and social handles via a plain unauthenticated
`curl` against Firestore's REST API. The app's own name-masking UI never
protected against this — it only hid fields in the browser after the full,
unmasked document had already been sent to it.

A second finding: `people_by_email` (the email → `nahar_id` lookup table) was
readable by *any* signed-in Google account, not just admins or the record's
own owner — letting an unapproved stranger scrape a verified list of every
real email address in the family.

## Why encryption wasn't the fix

Firestore already encrypts everything at rest and in transit by default. The
problem was never weak encryption — it was that the rules handed the
(already-decrypted, as they must be to render the UI) data to anyone who
asked. The actual fix is entirely about who's allowed to ask.

## The fix

Firestore security rules can't hide individual fields within one document
read — a rule grants or denies the whole document. The only way to make
"tree structure is public, contact details are not" a real, database-level
guarantee (not just a UI convention) is to put them in two different
documents with two different rules:

- **`people/{naharId}`** — public shape. `nahar_id`, `name`, `gender`,
  `generation`, `parents`, `spouse`, `children`, `status`, `isBloodline`,
  `linkedFamilyOf`, `linkedFamilyLabel`, `claimed`, `role`,
  `isPlaceholderEmail`, `addedBy`, `addedAt`. Readable by any **signed-in**
  visitor (not merely masked in the UI) — needed so the tree's shape and the
  self-claim name-matching flow work before someone is approved.
- **`people/{naharId}/private/details`** — everything that could identify or
  contact someone in the real world: `phone`, `email`, `dateOfBirth`,
  `marriageDate`, `profession`, `qualification`, `location`, `photo`,
  `instagram`, `facebook`, `linkedin`, `notes`. Readable only by an admin or
  any **matched** member (someone whose own signed-in email resolves to a
  `Person` via `people_by_email`) — never by an anonymous or unmatched
  visitor. This preserves the existing design where any verified family
  member can see any other member's contact info (not narrowed to
  relatives-only) — the fix is about keeping strangers out, not restricting
  access among approved family.
- **`people_by_email/{email}`** — read narrowed to the account whose own
  email it is, or an admin. Nobody needs to read someone else's mapping
  client-side.

`src/data/schema.ts` models this as `PublicPerson` + `PrivatePersonDetails`,
merged client-side into the full `Person` shape every component already
expects (`src/lib/dataSource.ts`). A caller who can't read the private
subcollection gets every private field back as `null` rather than an error —
exactly what "this person's contact details are hidden from you" already
meant before the split, just now enforced by the database instead of trusted
to the UI.

## A real gotcha hit and fixed during this work

`dataSource.ts` fetches every visible person's private details in one
`collectionGroup('private')` query rather than N individual reads. Firestore
rules have a scoping quirk: a nested rule (`match
/people/{naharId}/private/details`) governs single-document/scoped reads but
does **not** automatically cover a `collectionGroup()` query — that needs its
own top-level wildcard rule (`match /{path=**}/private/{document}`) or the
query is denied outright, silently, regardless of the nested rule. Both rule
blocks now delegate to the same `canReadPrivateDetails()` function so they
can't drift apart. This was caught by real end-to-end testing (a matched
member's own profile page showed no contact fields at all) — a good
reminder that rules review alone isn't enough; every change here was verified
against the live deployed rules with a real signed-in browser session.

## Migration

`scripts/migrate-split-private-fields.ts` — one-off, idempotent, moves the
private fields off each existing `people/{id}` doc into a new
`people/{id}/private/details` doc. Already run against `thenahars-dev`.

## What's verified

- `scripts/test-private-split-rules.ts` — the rules boundary itself: anonymous
  rejected from both public and private docs; unmatched-but-signed-in gets
  public only; matched members can read (but not write outside their own
  editable relatives) each other's private details; `people_by_email` scoped
  correctly.
- Reproduced the exact anonymous-`curl` attack from the original audit
  against the live deployed rules — now returns `403 PERMISSION_DENIED`.
- Full signed-in browser E2E: editing personal fields correctly splits the
  write across both documents, the detail page renders the saved values,
  directory search (which only needs the public `name` field) still works.
- The pre-existing add-person / linked-family / bloodline / admin-delete /
  pending-claims rule test suites were all re-run and still pass — this
  change didn't regress the deeper permission model, only the field
  visibility boundary.

## Follow-up not done here

**App Check** (Firestore/Auth request attestation, free on Spark) is wired
into `src/lib/firebase.ts` but inert until a reCAPTCHA v3 site key is
generated in the Firebase Console and set as `VITE_RECAPTCHA_SITE_KEY`. See
`.env.example` for the exact steps — deliberately left as a manual,
opt-in step since flipping enforcement on incorrectly could lock out real
users, and this was a Low-severity finding (scripted-abuse protection, not
data exposure) compared to the two fixed above.
