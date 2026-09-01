/**
 * Verifies the public/private field split introduced to fix the data
 * exposure audit findings:
 *   1. Anonymous (fully unauthenticated) read of people/{id} is REJECTED.
 *   2. Anonymous read of people/{id}/private/details is REJECTED.
 *   3. A signed-in-but-UNMATCHED visitor CAN read the public people/{id}
 *      doc (needed for tree shape + claim matching) but CANNOT read
 *      private/details.
 *   4. A MATCHED member (any, not just relatives) CAN read another
 *      person's private/details — this preserves the existing "verified
 *      family sees each other's contact info" design, it's not narrowed
 *      to relatives-only.
 *   5. Only that matched member / admin can WRITE to a private/details
 *      doc they're authorized to edit; an unrelated matched member cannot.
 *   6. people_by_email is no longer readable by "any signed-in account" —
 *      only the owner of that email, or an admin.
 *
 * Run against thenahars-dev only. Cleans up everything it creates.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-private-split-rules.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const apiKey = process.env.TEST_FIREBASE_API_KEY
if (!credentialsPath || !apiKey) {
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) and TEST_FIREBASE_API_KEY (Web API key from .env.local).',
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
const projectId = serviceAccount.project_id as string

initAdmin({ credential: cert(serviceAccount) })
const adminDb = getAdminFirestore()
const adminAuth = getAdminAuth()

const clientApp = initializeApp({ projectId, apiKey })
const clientAuth = getAuth(clientApp)
const db = getFirestore(clientApp)

const UNMATCHED_EMAIL = 'test-split-unmatched@example.com'
const MATCHED_EMAIL_A = 'test-split-matched-a@example.com'
const MATCHED_EMAIL_B = 'test-split-matched-b@example.com'
const PERSON_A_ID = 'N-TEST-SPLIT-A'
const PERSON_B_ID = 'N-TEST-SPLIT-B'

function publicDoc(id: string, overrides: Record<string, unknown>) {
  return {
    nahar_id: id,
    name: 'Test Person',
    gender: 'other',
    generation: 1,
    parents: [],
    spouse: [],
    children: [],
    addedBy: null,
    addedAt: null,
    isPlaceholderEmail: false,
    isBloodline: true,
    linkedFamilyOf: null,
    linkedFamilyLabel: null,
    status: 'living',
    claimed: false,
    role: 'member',
    ...overrides,
  }
}

function privateDoc(overrides: Record<string, unknown>) {
  return {
    phone: null,
    dateOfBirth: null,
    marriageDate: null,
    email: null,
    profession: null,
    qualification: null,
    location: null,
    photo: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    notes: null,
    ...overrides,
  }
}

async function main() {
  console.log('Setting up two unrelated matched people, and one unmatched account...')
  const unmatchedUser = await adminAuth
    .getUserByEmail(UNMATCHED_EMAIL)
    .catch(() => adminAuth.createUser({ email: UNMATCHED_EMAIL, emailVerified: true }))
  const matchedUserA = await adminAuth
    .getUserByEmail(MATCHED_EMAIL_A)
    .catch(() => adminAuth.createUser({ email: MATCHED_EMAIL_A, emailVerified: true }))
  const matchedUserB = await adminAuth
    .getUserByEmail(MATCHED_EMAIL_B)
    .catch(() => adminAuth.createUser({ email: MATCHED_EMAIL_B, emailVerified: true }))

  await adminDb
    .collection('people')
    .doc(PERSON_A_ID)
    .set(publicDoc(PERSON_A_ID, { name: 'Test Split Person A', email: MATCHED_EMAIL_A, claimed: true }))
  await adminDb
    .collection('people')
    .doc(PERSON_A_ID)
    .collection('private')
    .doc('details')
    .set(privateDoc({ email: MATCHED_EMAIL_A, phone: '1111111111' }))
  await adminDb.collection('people_by_email').doc(MATCHED_EMAIL_A).set({ nahar_id: PERSON_A_ID })

  await adminDb
    .collection('people')
    .doc(PERSON_B_ID)
    .set(publicDoc(PERSON_B_ID, { name: 'Test Split Person B', email: MATCHED_EMAIL_B, claimed: true }))
  await adminDb
    .collection('people')
    .doc(PERSON_B_ID)
    .collection('private')
    .doc('details')
    .set(privateDoc({ email: MATCHED_EMAIL_B, phone: '2222222222' }))
  await adminDb.collection('people_by_email').doc(MATCHED_EMAIL_B).set({ nahar_id: PERSON_B_ID })

  let ok = true

  console.log('\n--- Test 1: fully anonymous public-doc read (should FAIL) ---')
  try {
    const snap = await getDoc(doc(db, 'people', PERSON_A_ID))
    if (snap.exists()) {
      console.error('FAIL — anonymous read succeeded, expected rejection')
      ok = false
    }
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log('\n--- Test 2: fully anonymous private-doc read (should FAIL) ---')
  try {
    const snap = await getDoc(doc(db, 'people', PERSON_A_ID, 'private', 'details'))
    if (snap.exists()) {
      console.error('FAIL — anonymous read succeeded, expected rejection')
      ok = false
    }
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log('\n--- Test 3: signed-in-but-unmatched visitor ---')
  const unmatchedToken = await adminAuth.createCustomToken(unmatchedUser.uid)
  await signInWithCustomToken(clientAuth, unmatchedToken)
  try {
    const pubSnap = await getDoc(doc(db, 'people', PERSON_A_ID))
    console.log(
      pubSnap.exists() ? 'PASS — unmatched visitor CAN read public doc' : 'FAIL — public read denied',
    )
    if (!pubSnap.exists()) ok = false
  } catch (err) {
    console.error('FAIL — unmatched visitor could not read public doc:', err)
    ok = false
  }
  try {
    await getDoc(doc(db, 'people', PERSON_A_ID, 'private', 'details'))
    console.error('FAIL — unmatched visitor read private doc, expected rejection')
    ok = false
  } catch {
    console.log('PASS — unmatched visitor rejected from private doc')
  }
  await signOut(clientAuth)

  console.log("\n--- Test 4: matched member B reads UNRELATED matched member A's private doc ---")
  const matchedTokenB = await adminAuth.createCustomToken(matchedUserB.uid)
  await signInWithCustomToken(clientAuth, matchedTokenB)
  try {
    const snap = await getDoc(doc(db, 'people', PERSON_A_ID, 'private', 'details'))
    console.log(
      snap.exists() && snap.data()?.phone === '1111111111'
        ? "PASS — matched member B can read A's private details (design: any matched member, not relatives-only)"
        : 'FAIL — unexpected result',
    )
    if (!snap.exists()) ok = false
  } catch (err) {
    console.error("FAIL — matched member B was rejected reading a stranger's private doc:", err)
    ok = false
  }

  console.log(
    "\n--- Test 5: matched member B attempts to WRITE to A's private doc (should FAIL — not a relative) ---",
  )
  try {
    await updateDoc(doc(db, 'people', PERSON_A_ID, 'private', 'details'), { phone: '9999999999' })
    console.error('FAIL — expected write to be rejected')
    ok = false
  } catch {
    console.log('PASS — rejected as expected (B is not related to A)')
  }
  await signOut(clientAuth)

  console.log("\n--- Test 6: people_by_email — matched member B reads A's email lookup (should FAIL) ---")
  await signInWithCustomToken(clientAuth, matchedTokenB)
  try {
    const snap = await getDoc(doc(db, 'people_by_email', MATCHED_EMAIL_A))
    if (snap.exists()) {
      console.error("FAIL — B could read A's email lookup doc, expected rejection")
      ok = false
    }
  } catch {
    console.log('PASS — rejected as expected (only the owner or an admin may read it)')
  }
  try {
    const ownSnap = await getDoc(doc(db, 'people_by_email', MATCHED_EMAIL_B))
    console.log(ownSnap.exists() ? 'PASS — B can read their own email lookup doc' : 'FAIL — own read denied')
  } catch (err) {
    console.error('FAIL — B could not read their own email lookup:', err)
    ok = false
  }
  await signOut(clientAuth)

  console.log('\nCleaning up...')
  await adminDb.collection('people').doc(PERSON_A_ID).collection('private').doc('details').delete()
  await adminDb.collection('people').doc(PERSON_B_ID).collection('private').doc('details').delete()
  await adminDb.collection('people').doc(PERSON_A_ID).delete()
  await adminDb.collection('people').doc(PERSON_B_ID).delete()
  await adminDb.collection('people_by_email').doc(MATCHED_EMAIL_A).delete()
  await adminDb.collection('people_by_email').doc(MATCHED_EMAIL_B).delete()
  await adminAuth.deleteUser(unmatchedUser.uid)
  await adminAuth.deleteUser(matchedUserA.uid)
  await adminAuth.deleteUser(matchedUserB.uid)

  console.log(ok ? '\nAll tests passed.' : '\nSome tests FAILED — see above.')
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
