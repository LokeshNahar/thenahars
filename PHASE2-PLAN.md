# Phase 2 Plan: Real Auth + Self-Service Editing

Status: approved, not yet built. Executing on `dev` branch.

## Context

Phase 1 shipped a static, read-only family tree + directory. Phase 2 adds real Google Sign-In, lets members edit their own (and immediate relatives') personal details, introduces admins who can edit anyone and link accounts, and personalizes the homepage/tree for a logged-in member. Everything stays on Firebase's free Spark plan — no Cloud Functions, no billing account required.

## Environments

- **Branches**: `dev` → `uat` → `main` (all created, pushed). Only `main` deploys (GitHub Pages, existing workflow). `dev`/`uat` are tested via `npm run dev` locally with branch-specific `.env.local` files (gitignored, never committed).
- **Firebase projects**: three fully separate projects — `thenahars-dev`, `thenahars-uat`, `thenahars-prod`. Each has its own Auth users, Firestore data, Storage. No shared quota.
- **Env vars** (unchanged from existing `src/lib/firebase.ts` reads): `VITE_USE_FIREBASE`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. `dev`/`uat` set these in a local `.env.local`; `main`'s deploy workflow injects them from 6 GitHub Actions secrets at build time (Vite inlines `import.meta.env.*` at build, so the file only needs to exist during `npm run build` in CI).

## Firebase project setup (manual, user performs — 3x, once per project)

1. Firebase Console → Add project → disable Analytics → Create.
2. Authentication → Sign-in method → enable **Google** provider, set support email.
3. Authentication → Settings → Authorized domains → `localhost` (default); for `thenahars-prod` also add the GitHub Pages domain now and `thenahars.in` later.
4. Firestore Database → Create → **production mode** → pick one region (recommend `asia-south1`, same across all 3 projects — can't change later).
5. Storage → Get started → production mode → same region.
6. Project Settings → General → Add app → Web → copy the 6 config values into that environment's `.env.local` / GitHub secrets.
7. No manual Firestore indexes needed — the data model below avoids queries that require them.

## Data model

- `people/{nahar_id}` — mirrors the existing `Person` type 1:1. `parents`/`spouse`/`children` stay as arrays of `nahar_id` strings, walked client-side exactly as `treeBuilder.ts` does today — no composite indexes needed.
- `people_by_email/{emailLowercased}` — denormalized lookup doc `{ nahar_id: string }`. Makes both login-time matching and Firestore rules' permission checks an O(1) `get()` instead of a query.
- **Sync mechanism (no Cloud Function)**: the app writes `people/{id}` and `people_by_email/{email}` together via `writeBatch(db)` whenever a person's `email` field changes. Firestore rules require that any write to `people_by_email/{email}` can only point at a `nahar_id` the writer is already authorized to edit — so a client can't forge a lookup pointing at someone else's record.

## Data architecture

Once an environment's Firestore is seeded (one-time migration script, `scripts/seed-firestore.ts`, using `firebase-admin` + a service account key, run locally and never committed), **Firestore becomes the live source of truth for all reads** — tree, directory, search, everything. The bundled `people.json` remains only as: (a) the seed source for that migration, and (b) a fallback when `VITE_USE_FIREBASE=false` (local dev without Firebase configured). `usePeople()`/`usePerson()` in `src/hooks/usePeople.ts` need **no changes** — only `src/lib/dataSource.ts` gets a new implementation, selected at runtime based on whether `db` is non-null.

## Firestore security rules (`firestore/firestore.rules`, replaces the `.draft` file)

Real, deployed rules (not a draft) implementing:
- Anyone can read `people/*`.
- A signed-in member can update their own record, or their parents'/spouse'/children's records — but **only personal fields** (`name`, `phone`, `email`, `profession`, `location`, `photo`, `status`, `notes`). `nahar_id`, `claimed`, `role`, and the relationship arrays (`parents`, `spouse`, `children`) are locked to admin-only writes.
- `role == "admin"` can write anywhere, including relationships and creating/deleting people.
- `people_by_email/{email}` writes are only allowed if the writer is already authorized (self/relative/admin) to edit the `nahar_id` the doc points at.
- Permission checks resolve the caller's own person record via `people_by_email/{their email}` → `people/{nahar_id}`, all as direct document `get()`s, no queries.

## Auth implementation

- `src/context/AuthContext.tsx` rewritten (same exported names, so no other file needs to change just because this one did): `signInWithPopup(auth, new GoogleAuthProvider())` for sign-in (popup chosen over redirect — keeps the user on-page, pairs better with the personalized welcome/auto-zoom since there's no reload); `signOut(auth)` for sign-out; `onAuthStateChanged` subscription resolves the matched person via `people_by_email` → `people/{id}`.
- `AuthUser` grows to `{ email, naharId: string | null, name: string | null, photoURL: string | null, role: 'member' | 'admin' | null }`. `naharId: null` means signed in but unmatched.
- Entirely inert when `VITE_USE_FIREBASE=false`, same contract `firebase.ts` already established.

## Admin bootstrap

One-time per environment (3 times total, ever) via the Firebase Console's Firestore data editor — required because before any admin exists, no one can pass the rules to create the first admin through the app:
1. Set `people/N-0010` — `email: "lokeshnahar01@gmail.com"`, `role: "admin"`, `claimed: true`.
2. Create `people_by_email/lokeshnahar01@gmail.com` — `{ nahar_id: "N-0010" }`.
3. Sign in as that account to confirm the match resolves.

After this, all further admin promotions and email-linking happen through the in-app Admin page (below) — no more manual console edits.

## New UI

- **`UserMenu`** (in `Navbar.tsx`): logged-out shows a "Sign In" button (Google "G" mark, glass style, reusing `MagneticButton`); logged-in shows an avatar → dropdown with matched name, "My Profile" link, "Admin" link (if admin), "Sign Out".
- **"Not yet in the tree" banner**: a dismissible `glass` banner shown globally when signed in but `naharId` is null — explains an admin will link their account soon. User can still browse read-only like any visitor.
- **`AdminPage`** (`/admin`, admin-only): searchable list of all people (reuses the directory's list/filter pattern) with inline email-linking and admin-toggle actions.
- **`PersonEditForm`**: the first real edit UI, personal fields only (per the decision above). Shown as an "Edit" button on `PersonDetailPage` when the viewer is self/relative/admin (checked client-side via a shared `src/lib/permissions.ts` helper, mirrored by — but not a substitute for — the real server-side rules).
- **Hero "Welcome, Name"**: when logged in and matched, the hero's eyebrow badge becomes "Welcome back, {first name}" using the same entrance animation already in place, keeping "The Nahars" as the headline. Optionally a "View Your Branch" CTA alongside/replacing "Explore the Tree".
- **Tree auto-zoom-to-me**: `FamilyTreeCanvas` gains an optional `focusId` prop. On mount, a new `getAncestorChain(personId, people)` helper (in `treeBuilder.ts`) computes root→person ancestor ids, seeds the expanded-set with them, and after layout settles, calls the existing `zoomToElement` mechanism (same one already used for expand/collapse framing) on the focused node. `FamilyTreePage` reads a `focus` query param, falling back to the logged-in user's own `naharId` — so simply visiting `/tree` while logged in auto-frames you. Lives only on the full `/tree` page, not the homepage's lightweight `TreePreview` teaser (keeps that component simple; the Hero's new CTA is the one-click bridge into the full experience). A subtle pulsing glow ring on the focused node (new keyframe in `index.css`) draws the eye once the camera settles.

## Build order

1. Firebase project setup (3x, manual).
2. Env config (`dev` branch `.env.local`, `.env.example` docs, `deploy.yml` secret injection step).
3. Seed script + run against `thenahars-dev`.
4. Real `firestore.rules`, deploy to `thenahars-dev`.
5. Real `AuthContext` — sign-in/out working, `naharId` still null (expected, no links yet).
6. Admin bootstrap on `thenahars-dev`.
7. `HybridDataSource` (Firestore-backed `DataSource` implementation) — verify tree/directory unchanged.
8. `UserMenu` in `Navbar`.
9. "Not yet in the tree" banner — test with a second Google account.
10. `permissions.ts` + `PersonEditForm` — test self-edit, relative-edit, admin-edit, and confirm an unauthorized edit is actually rejected by the deployed rules (not just hidden in the UI).
11. `AdminPage` — use it to link a second real family member end-to-end.
12. Personalization: Hero welcome message, tree auto-zoom, focus-ring polish.
13. Promote `dev` → `uat`: repeat seed + rules + bootstrap against `thenahars-uat`, full regression.
14. Promote `uat` → `main`: populate GitHub Actions secrets, seed + deploy rules to `thenahars-prod`, bootstrap admin there, push, verify live site (including adding the Pages domain to `thenahars-prod`'s Auth authorized domains — easy to forget, breaks sign-in only in prod if missed).

## Verification

- After step 5: sign in/out locally against `thenahars-dev`, confirm Firebase Auth Console shows the user.
- After step 10: attempt an edit as a non-relative in dev tools/console directly against Firestore (bypassing the UI) to confirm rules reject it, not just that the button is hidden.
- After step 12: log in as the bootstrapped admin, confirm the hero greeting and tree auto-zoom both fire correctly, and that logged-out browsing is completely unaffected.
- Before promoting to `main`: full click-through on `uat` exactly as a real user would (sign in, edit own profile, admin-link a second account, sign out, confirm logged-out view still works).
