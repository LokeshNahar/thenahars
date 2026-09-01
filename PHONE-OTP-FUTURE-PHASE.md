# Phone OTP Self-Claim & Session Security — Future Phase (Not Built)

## Status

Not built. The admin-approval claim flow (`ClaimProfileForm` → `pending_claims` →
`AdminPage` review) ships instead, for now, because it's free on the Firebase Spark
plan. This doc records the phone-OTP alternative and its real cost, so the decision
can be revisited later without re-deriving it. It also records two standing
session-security requirements (OTP required on every login, and a 5-minute
auto-expiring session with manual extend) that apply once this phase is built —
see the two "Standing requirement" sections below.

## Why this wasn't built now

Firebase Phone Auth (SMS-based OTP) is **not free** for real SMS delivery:

- It requires the **Blaze (pay-as-you-go) plan** — Spark (free) does not support
  sending real SMS at all (only a small quota of test phone numbers configured in
  the console, not usable for real family members).
- Blaze itself has **no fixed monthly minimum** — you only pay for what's actually
  used — but it does require a billing card on file, and Firebase Phone Auth charges
  **per SMS verification sent**, roughly $0.01–$0.06+ depending on the destination
  country (India-specific pricing should be checked against the current
  [Firebase Authentication pricing page](https://firebase.google.com/pricing) at
  build time, since rates change).
- For a family tree with dozens to low-hundreds of members, this is a small total
  cost, but it's not the "$0 forever" guarantee the Spark plan gives everything else
  in this project (Firestore free tier, hosting, etc.).

## What it would replace

Phone OTP would let a user self-verify their identity by proving control of a phone
number already recorded against a `Person` (`phone` field), skipping the admin
approval step in the claim flow — the OTP itself becomes the trust boundary instead
of a human reviewing name + parents' names.

## Rough shape if built later

1. Upgrade the Firebase project (`thenahars-dev`/`uat`/`prod` as needed) to Blaze.
2. Add `signInWithPhoneNumber` (client SDK) + an invisible reCAPTCHA verifier to the
   sign-in flow, alongside (not replacing) Google Sign-In — some members may prefer
   email, others phone.
3. On successful phone verification, look up a `Person` whose `phone` field matches
   the verified number (E.164-normalized) and offer to link that record directly —
   no `pending_claims` doc needed for this path, since the phone number itself
   already IS the anchor to a specific `nahar_id` set by whoever entered it
   originally (so this only works for numbers already on file; someone with no
   recorded phone still needs the name-based claim flow or an admin's help).
4. Firestore rules: a new `allow update` branch letting a phone-verified caller
   link `people_by_email` to themselves as long as the target Person's `phone`
   matches `request.auth.token.phone_number` — mirrors the existing
   `people_by_email` self-link case, just keyed by phone instead of the
   admin-approval path.
5. Decide whether admin approval stays required even for a phone-verified match
   (extra safety net against a wrong/shared phone number) or whether phone
   verification alone is trusted to auto-link — that's a product decision, not a
   technical one, and should be asked explicitly when this phase is picked up.

## Decision trigger

Revisit this if: the admin-approval queue becomes a bottleneck (admin unavailable,
claims piling up), or the family explicitly wants zero-human-in-the-loop
self-service and is fine with the small per-SMS cost on Blaze.

## Standing requirement: OTP on every login, not just first-time claim

User instruction (2026-08-31): once phone OTP is built, it should not be a
one-time identity-claim step only — **every** login/sign-in to the app should
require OTP verification, every time, not just the first time a person links
their phone number to their record. Re-verifying a previously-linked phone on
each session (rather than trusting a long-lived session token alone) is a
deliberate choice to raise the bar against a stolen/shared device or a
long-forgotten logged-in browser exposing family contact data.

This changes step 2 above from "OTP only during initial linking" to: OTP (or
equivalent step-up) gates every sign-in, and a returning user with an already
E.164-verified phone still has to receive and enter a fresh code each time
they start a session — the phone number identity is remembered, the session
is not.

## Standing requirement: 5-minute session expiry with manual extend

User instruction (2026-08-31), modeled explicitly on the **Indian Income Tax
e-filing portal's** session behavior: a logged-in session should expire after
**5 minutes of the session being open**, unless the user proactively clicks an
"Extend Session" control before it lapses — mirroring the income tax portal's
pattern of a visible countdown/warning with an explicit extend action, rather
than silently logging someone out or leaving them logged in indefinitely.

Shape, to implement alongside phone OTP (this is a session-management
change, not itself dependent on Blaze/SMS — it could technically land on its
own, but is being scoped here since it was requested in the same breath as
the "OTP every login" requirement and both are about tightening the
authenticated-session trust boundary):

1. Track a session-start (or last-extend) timestamp client-side (e.g. in
   memory / `sessionStorage`, not `localStorage`, so it doesn't survive
   closing the tab — consistent with "no long-lived trust").
2. Show a visible warning/countdown as the 5-minute mark approaches (income
   tax portal shows a modal with a countdown and an "Extend Session" button
   in the final ~1 minute) — don't let it expire with zero warning.
3. On expiry with no extend click: sign the user out (`auth.signOut()`),
   clear any sensitive in-memory state, and redirect to a "session expired,
   please sign in again" screen — not a silent redirect that could look like
   a bug.
4. "Extend Session" resets the timer without requiring a full re-auth (it's a
   session-length control, not a re-verification step — OTP-per-login above
   is the re-verification control, this is separate and composes with it).
5. Apply this to the real authenticated session only — has no effect while
   `VITE_USE_FIREBASE=false` / Firebase is inert, same as the rest of this
   doc.
6. Open product question for whichever future session picks this up: does
   the 5-minute clock run from sign-in regardless of activity, or reset on
   user activity (mouse/keyboard/nav) the way many "idle timeout" patterns
   work instead of a true fixed-window timeout? The income tax portal's own
   behavior should be checked again at build time to confirm which of these
   it actually implements before copying it — this doc currently assumes a
   fixed 5-minute window per the user's phrasing ("expires in 5 mins, unless
   the user clicks on extend"), not an idle timeout, but that should be
   confirmed against the real portal, not assumed.
