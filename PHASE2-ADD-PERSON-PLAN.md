# Add-Person & Linked-Family Plan

Status: approved, not yet built. Executing on `dev` branch, building on top of the completed Phase 2 auth/editing work (see `PHASE2-PLAN.md`).

## Context

Phase 2 gave members the ability to edit existing people's personal fields. This extends that to letting members **add new people and relationships** — their own parents/spouse/children, their descendants' spouses, and so on — plus a way to attach a whole separate lineage (e.g. a mother's own birth family) that stays invisible in the main tree until deliberately revealed via a fold/takeover view.

## Decisions made

1. **New-person creation requires name + email upfront.** A "No email yet" button fills an auto-generated placeholder (`no-email.<nahar_id>@thenahars.placeholder`, lowercase, keyed by id not name so it survives name corrections) so no one is ever blocked from being added. `isPlaceholderEmail: boolean` flags this; an admin replaces it with a real email later via the existing `AdminPage` linking flow.
2. **Who can add what**: a member may create a new person anchored on anyone they can already **edit** under the existing `canEditPerson` boundary (self, immediate relative, or admin). Concretely this means: their own parent/spouse/child, their spouse's parent, their child's spouse, a sibling (via their parent's page), and so on — the boundary composes correctly across depth because each addition happens on the actual intermediate person's own page, not in one giant jump. Two emergent allowances confirmed as intended: **siblings can be added** (via a parent's page) and **a linked-family root becomes editable by the connecting person** (see below) and transitively by anyone who can edit the connecting person.
3. **Linked external families** (e.g. a mother's own parents/siblings) are second-root `Person` records in the same `people` collection, marked `linkedFamilyOf: <connecting person's nahar_id>` and `linkedFamilyLabel: <e.g. "Mother's Family">` — never `parents`/`spouse`/`children`-linked to the main tree, so they're structurally invisible to normal traversal. `findRootId` is fixed to exclude `linkedFamilyOf`-set records from root selection.
4. **Reveal interaction**: a small toggle (near the connecting person's node in the tree, and on their detail page) opens a **full-screen takeover** — the same `FamilyTreeCanvas` component rooted at the linked person instead of the main root, with a header showing the branch label and a "← Back to {Anchor} in the Nahar tree" button. Closing it returns to `/person/{anchor}` or `/tree?focus={anchor}` (reuses the existing auto-frame mechanism — no custom state restoration).
5. **Admin audit view**: `AdminPage` gets a filter/sort for recently self-service-added people (`addedBy != null`, sorted by `addedAt`) so admins can spot-check without a full approval gate.

## Data model additions (`src/data/schema.ts`)

```ts
addedBy: string | null          // nahar_id of whoever added this record; null for seed/admin-created
addedAt: Timestamp | null       // Firestore server timestamp
isPlaceholderEmail: boolean     // true only for the no-email.* convention
linkedFamilyOf: string | null   // connecting person's nahar_id, only set on a linked-family root
linkedFamilyLabel: string | null // e.g. "Mother's Family" — only meaningful with linkedFamilyOf set
```

`findRootId` filter becomes `p.parents.length === 0 && !p.linkedFamilyOf`. `buildFamilyUnit`/`getAncestorChain` need no changes — a linked root is simply unreachable from the main root's traversal since nothing's `parents`/`spouse`/`children` array references it.

`meta/id_counter` — new doc `{ nextSeq: number }`, updated only inside a `runTransaction` alongside the new person's creation, giving collision-safe sequential `N-00xx` ids without a Cloud Function.

## Firestore rules additions

- `allow create` on `people/{naharId}` extended (currently admin-only) with a non-admin branch: the new document's `parents`/`spouse`/`children` must reference exactly one anchor the caller can already edit, with the other two arrays empty at creation time; `addedBy` must equal the caller, `addedAt` must equal `request.time`, `role` must be `'member'`, `claimed` must be `false`.
- `allow update` extended with a `relationshipFieldsChangedAreValid` branch: a non-admin may add (never remove/reorder) exactly one id to their own `parents`/`spouse`/`children` array, and only if that id belongs to a person whose `addedBy` is themself — i.e. you can only splice in someone you just created, never re-link two pre-existing people (that stays admin-only).
- `isImmediateRelative`/`canEditPerson` (both rules and `permissions.ts`) gain one more clause: `target.linkedFamilyOf == me.nahar_id` grants edit rights, so the connecting person (and transitively anyone who can edit them) can manage a linked branch.
- Linked-root creation reuses the same `create` rule shape with `linkedFamilyOf` set instead of a relationship-array anchor.

## New UI

- **`AddPersonForm.tsx`** — minimal by design: name, email (+ "No email yet" placeholder button), gender (3-option pill control), optional living/deceased toggle. Nothing else — richer fields get filled in afterward via the existing `PersonEditForm`. A co-parent checkbox appears only when adding a child and the anchor has a recorded spouse. `.glass-strong`, Playfair heading ("Add {Anchor}'s {Relation}"), `MagneticButton` for submit.
- **`PersonDetail.tsx`** — empty relation sections (Parents/Spouse/Children) become "+ Add" prompts instead of rendering nothing, gated by `canAddRelationship`; non-empty sections get an additional dashed "+ Add" tile appended.
- **`permissions.ts`** — new `canAddRelationship(user, anchor, relation)` (mirrors the rules' anchor check) and `isDescendantOf` (client-only convenience, since the client holds the full tree in memory).
- **`LinkedFamilyToggle.tsx`** — small pill button on `PersonDetailPage` and a corner badge on `TreeNode`/`MiniCard` when a person has a linked family.
- **`LinkedFamilyView.tsx`** — full-screen overlay reusing `FamilyTreeCanvas` via a new optional `rootIdOverride` prop, a scoped accent-color tint (cooler tone, via a CSS var override on the wrapping div) so it reads as "a different branch" without new component styling, breadcrumb back button.
- **`AdminPage.tsx`** — small addition: a filter/sort toggle for recently self-added people.

## Build order

1. Data model fields + `meta/id_counter` + rules rewrite, deployed to `thenahars-dev`. Manual client-SDK test script verifying a member can add their own child but not an unrelated stranger's, and concurrent adds don't collide.
2. Minimal add-flow: adding your own child only. `AddPersonForm` + transaction logic + `PersonDetail.tsx` entry point. Test end-to-end signed in for real.
3. Extend to spouse/parent cases, co-parent checkbox, relative-anchor cases (grandchild via child's page, child's spouse).
4. Placeholder-email flow + `AdminPage` real-email-linking clears `isPlaceholderEmail`.
5. Linked-family-root mechanism: fields, `findRootId` fix, rules, `LinkFamilyRootForm`. Verify a linked root never appears in the default tree view.
6. Toggle + full-screen takeover UI, built last over already-proven data support.
7. `AdminPage` audit filter.

## Verification

- After step 1: run the test script against `thenahars-dev`, confirm rejection of an unrelated-stranger create and successful concurrent-id-collision-free creation.
- After each of steps 2–3: sign in as a real test account, add each relationship kind, confirm the reverse link appears on the anchor's own record and the new person is immediately visible/editable correctly.
- After step 5: confirm `/tree` (no query params) never shows a linked-family branch, even after one exists in Firestore.
- After step 6: full click-through — open a linked family from both the tree-node badge and the detail-page toggle, confirm the back button returns to the right place.
