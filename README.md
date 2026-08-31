# The Nahars

A living family tree and directory for the Nahar family — an animated, searchable record of names,
professions, locations, and how everyone is connected.

This is an early, static milestone: no login yet, a small seed dataset, and the visual/data
foundation for everything that comes next.

## Stack

Vite + React + TypeScript, Tailwind CSS 4, Framer Motion, React Router, `d3-hierarchy` for tree
layout, `react-zoom-pan-pinch` for pan/zoom. Firebase is installed but inert (see below).

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build     # production build, type-checks first
npm run lint       # oxlint
```

## Data

Family data lives in [`src/data/people.json`](src/data/people.json), typed by
[`src/data/schema.ts`](src/data/schema.ts). Every person has a unique `nahar_id` (e.g. `N-0001`) —
this is the primary key and should never be reused or renumbered.

Components never import `people.json` directly — they go through
[`src/lib/dataSource.ts`](src/lib/dataSource.ts) via the `usePeople()` hook, so the storage layer
can be swapped for Firestore later without touching any UI code.

### Data completeness — still to add

Bhanwar Lal Nahar & Bhanwari Devi Nahar had 4 sons and 2 daughters. Only one son's branch
(Santosh Kumar Nahar → Lokesh & Prince) is filled in so far. The other five children exist in
`people.json` as placeholder records (`name: "Details coming soon"`) so the tree and directory
don't silently under-count the family — they render with a dashed/muted style and are excluded
from search. Still needed:

- [ ] Son 1 of 4 (`N-0003`)
- [ ] Son 3 of 4 (`N-0005`)
- [ ] Son 4 of 4 (`N-0006`)
- [ ] Daughter 1 of 2 (`N-0007`)
- [ ] Daughter 2 of 2 (`N-0008`)
- [ ] Everyone's phone, email, profession, location, and photo — all `null` for now
- [ ] Additional generations/roots as they're provided

## Firebase / Phase 2 (Google Sign-In + self-service editing)

Being built on the `dev` branch — see [`PHASE2-PLAN.md`](PHASE2-PLAN.md) for the full design.

- Three separate Firebase projects, one per environment: `thenahars-dev` (branch `dev`),
  `thenahars-uat` (branch `uat`), `thenahars-prod` (branch `main`, deployed). Each has its own
  Auth users and Firestore data. Storage is intentionally not provisioned (requires the Blaze
  plan; nothing in the app needs it yet — `photo` is a plain URL string field).
- `.env.example` documents the required config; each branch has its own git-ignored `.env.local`
  pointing at that branch's Firebase project. `main`'s config is injected from GitHub Actions
  secrets at build time, never committed.
- [`src/lib/firebase.ts`](src/lib/firebase.ts) only initializes when `VITE_USE_FIREBASE=true` —
  safe to import anywhere even when Firebase isn't configured.
- [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx) — Google Sign-In via Firebase
  Auth, matching the signed-in email against a `people/{nahar_id}.email` field.
- [`firestore/firestore.rules`](firestore/firestore.rules) — deployed rules: a signed-in member
  can edit their own (and immediate relatives') personal fields; only admins can edit
  relationship links (`parents`/`spouse`/`children`), roles, or create/delete people.
- [`scripts/seed-firestore.ts`](scripts/seed-firestore.ts) — one-off migration that seeds a
  Firestore project from `src/data/people.json`. Run once per environment (`npm run seed` with
  `GOOGLE_APPLICATION_CREDENTIALS` set to a downloaded service account key).
- Phone-number OTP self-claim is still deferred; not modeled beyond a reserved `claimed` field.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Repo Settings → Pages must be set
to source "GitHub Actions".

`vite.config.ts` currently uses `base: '/thenahars/'` to serve correctly at
`https://<user>.github.io/thenahars/`. When pointing the custom domain (see below), switch it
(and the `basename` in `src/main.tsx`) to `'/'` and add a `public/CNAME` file containing
`thenahars.in`.

### Pointing thenahars.in (GoDaddy) at GitHub Pages — do this when ready to go live

1. In GoDaddy DNS for `thenahars.in`, add four `A` records on `@` pointing to:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
2. (Optional) add a `CNAME` record for `www` pointing to `<github-username>.github.io`.
3. In the GitHub repo Settings → Pages, set the custom domain to `thenahars.in`.
4. Once DNS propagates (can take a few hours), enable "Enforce HTTPS" in the same settings page.
5. Add `public/CNAME` (containing just `thenahars.in`) to the repo so the custom domain survives
   future deploys, and switch `base`/`basename` to `'/'` as noted above.
