/**
 * Verifies the pending_claims Firestore rules:
 *   1. A signed-in user can create their own claim (doc id == own email).
 *   2. That user CANNOT create a claim under a different email (doc id).
 *   3. A non-admin cannot update/approve their own claim's status.
 *   4. A non-admin cannot read someone ELSE's claim.
 *   5. A non-admin CAN read their own claim.
 *   6. An admin CAN update (approve) and delete a claim.
 *
 * Run against thenahars-dev only. Cleans up everything it creates.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-pending-claims-rules.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

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

const CLAIMANT_EMAIL = 'test-claim-verify@example.com'
const OTHER_EMAIL = 'test-claim-other@example.com'
const ADMIN_EMAIL = 'test-claim-admin@example.com'

function claimPayload(email: string) {
  return {
    email,
    submittedName: 'Test Claimant',
    fatherName: 'Test Father',
    motherName: 'Test Mother',
    matchedNaharId: null,
    status: 'pending',
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  }
}

async function main() {
  console.log('Setting up test accounts...')
  const claimantUser = await adminAuth
    .getUserByEmail(CLAIMANT_EMAIL)
    .catch(() => adminAuth.createUser({ email: CLAIMANT_EMAIL, emailVerified: true }))
  const otherUser = await adminAuth
    .getUserByEmail(OTHER_EMAIL)
    .catch(() => adminAuth.createUser({ email: OTHER_EMAIL, emailVerified: true }))
  const adminUser = await adminAuth
    .getUserByEmail(ADMIN_EMAIL)
    .catch(() => adminAuth.createUser({ email: ADMIN_EMAIL, emailVerified: true }))

  // Give ADMIN_EMAIL an actual admin Person record so callerPerson()/isAdmin() resolve.
  const ADMIN_PERSON_ID = 'N-TEST-CLAIMS-ADMIN'
  await adminDb.collection('people').doc(ADMIN_PERSON_ID).set({
    nahar_id: ADMIN_PERSON_ID,
    name: 'Test Claims Admin',
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
    phone: null,
    dateOfBirth: null,
    email: ADMIN_EMAIL,
    profession: null,
    qualification: null,
    location: null,
    photo: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    status: 'living',
    claimed: true,
    role: 'admin',
  })
  await adminDb.collection('people_by_email').doc(ADMIN_EMAIL).set({ nahar_id: ADMIN_PERSON_ID })

  let ok = true

  try {
    console.log('\nTest 1: claimant creates their own claim (should succeed)...')
    const claimantToken = await adminAuth.createCustomToken(claimantUser.uid)
    await signInWithCustomToken(clientAuth, claimantToken)
    await setDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL), claimPayload(CLAIMANT_EMAIL))
    console.log('PASS')

    console.log('\nTest 2: claimant attempts to create a claim under a DIFFERENT email (should FAIL)...')
    try {
      await setDoc(doc(db, 'pending_claims', OTHER_EMAIL), claimPayload(OTHER_EMAIL))
      console.error('FAIL — expected Test 2 to be rejected')
      ok = false
    } catch {
      console.log('PASS — rejected as expected')
    }

    console.log('\nTest 3: claimant attempts to approve their OWN claim (should FAIL — non-admin update)...')
    try {
      await updateDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL), { status: 'approved' })
      console.error('FAIL — expected Test 3 to be rejected')
      ok = false
    } catch {
      console.log('PASS — rejected as expected')
    }

    console.log('\nTest 5: claimant reads their OWN claim (should succeed)...')
    const ownSnap = await getDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL))
    console.log(ownSnap.exists() ? 'PASS' : 'FAIL — could not read own claim')
    if (!ownSnap.exists()) ok = false

    await signOut(clientAuth)

    console.log("\nTest 4: a DIFFERENT non-admin user reads someone else's claim (should FAIL)...")
    const otherToken = await adminAuth.createCustomToken(otherUser.uid)
    await signInWithCustomToken(clientAuth, otherToken)
    try {
      const snap = await getDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL))
      if (snap.exists()) {
        console.error('FAIL — expected Test 4 read to be rejected, but data came back')
        ok = false
      } else {
        console.log('PASS — rejected as expected (empty/denied result)')
      }
    } catch {
      console.log('PASS — rejected as expected')
    }
    await signOut(clientAuth)

    console.log('\nTest 6: admin approves (updates status) and then deletes the claim...')
    const adminToken = await adminAuth.createCustomToken(adminUser.uid)
    await signInWithCustomToken(clientAuth, adminToken)
    await updateDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: ADMIN_PERSON_ID,
    })
    console.log('PASS — admin update succeeded')
    await deleteDoc(doc(db, 'pending_claims', CLAIMANT_EMAIL))
    console.log('PASS — admin delete succeeded')
    await signOut(clientAuth)
  } catch (err) {
    console.error('FAIL — unexpected error:', err)
    ok = false
  }

  console.log('\nCleaning up...')
  await adminDb
    .collection('pending_claims')
    .doc(CLAIMANT_EMAIL)
    .delete()
    .catch(() => {})
  await adminDb.collection('people').doc(ADMIN_PERSON_ID).delete()
  await adminDb.collection('people_by_email').doc(ADMIN_EMAIL).delete()
  await adminAuth.deleteUser(claimantUser.uid)
  await adminAuth.deleteUser(otherUser.uid)
  await adminAuth.deleteUser(adminUser.uid)

  console.log(ok ? '\nAll tests passed.' : '\nSome tests FAILED — see above.')
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
