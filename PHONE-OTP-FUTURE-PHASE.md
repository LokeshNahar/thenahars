# Phone OTP Self-Claim — Future Phase (Not Built)

## Status

Not built. The admin-approval claim flow (`ClaimProfileForm` → `pending_claims` →
`AdminPage` review) ships instead, for now, because it's free on the Firebase Spark
plan. This doc records the phone-OTP alternative and its real cost, so the decision
can be revisited later without re-deriving it.

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
