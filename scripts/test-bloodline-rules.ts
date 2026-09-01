/**
 * Verifies the isBloodline boundary added to newParentIsValid/newChildIsValid/
 * newSpouseIsValid/newLinkedFamilyRootIsValid: a married-in (non-bloodline)
 * person's own "Add Parent" must be REJECTED by rules (their parents must go
 * through the linked-family-root path instead), while a bloodline person's
 * "Add Parent" succeeds and the new parent correctly inherits isBloodline.
 *
 * Run against thenahars-dev only. Cleans up everything it creates.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-bloodline-rules.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { doc, getFirestore, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'

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

const TEST_EMAIL = 'test-bloodline-verify@example.com'
const BLOODLINE_ANCHOR_ID = 'N-TEST-BLOODLINE'
const MARRIED_IN_ANCHOR_ID = 'N-TEST-MARRIED-IN'

async function personDoc(id: string, overrides: Record<string, unknown>) {
  return {
    nahar_id: id,
    name: 'Test Person',
    gender: 'other',
    generation: 2,
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
    email: null,
    profession: null,
    qualification: null,
    location: null,
    photo: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    status: 'living',
    claimed: false,
    role: 'member',
    ...overrides,
  }
}

async function main() {
  console.log('Setting up test fixtures via Admin SDK...')
  const authUser = await adminAuth
    .getUserByEmail(TEST_EMAIL)
    .catch(() => adminAuth.createUser({ email: TEST_EMAIL, emailVerified: true }))

  await adminDb
    .collection('people')
    .doc(BLOODLINE_ANCHOR_ID)
    .set(
      await personDoc(BLOODLINE_ANCHOR_ID, {
        name: 'Test Bloodline Anchor',
        email: TEST_EMAIL,
        claimed: true,
        isBloodline: true,
      }),
    )
  await adminDb
    .collection('people')
    .doc(MARRIED_IN_ANCHOR_ID)
    .set(
      await personDoc(MARRIED_IN_ANCHOR_ID, {
        name: 'Test Married-In Anchor',
        spouse: [BLOODLINE_ANCHOR_ID],
        isBloodline: false,
      }),
    )
  await adminDb
    .collection('people')
    .doc(BLOODLINE_ANCHOR_ID)
    .update({ spouse: [MARRIED_IN_ANCHOR_ID] })
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).set({ nahar_id: BLOODLINE_ANCHOR_ID })

  console.log('Signing in as the test client...')
  const customToken = await adminAuth.createCustomToken(authUser.uid)
  await signInWithCustomToken(clientAuth, customToken)
  console.log('Signed in as', clientAuth.currentUser?.uid)

  let bloodlineParentId: string | null = null
  let ok = true

  try {
    console.log('\nTest 1: add a parent to the BLOODLINE anchor (should succeed, isBloodline == true)...')
    bloodlineParentId = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'meta', 'id_counter')
      const counterSnap = await tx.get(counterRef)
      const nextSeq = counterSnap.data()!.nextSeq as number
      const newId = `N-${String(nextSeq).padStart(4, '0')}`
      tx.update(counterRef, { nextSeq: nextSeq + 1 })
      tx.set(
        doc(db, 'people', newId),
        await personDoc(newId, {
          name: 'Test Bloodline Grandparent',
          generation: 1,
          children: [BLOODLINE_ANCHOR_ID],
          addedBy: BLOODLINE_ANCHOR_ID,
          addedAt: serverTimestamp(),
          isPlaceholderEmail: true,
          isBloodline: true,
          email: `no-email.${newId.toLowerCase()}@thenahars.placeholder`,
        }),
      )
      return newId
    })
    console.log('PASS — created', bloodlineParentId)
  } catch (err) {
    console.error('FAIL — expected Test 1 to succeed:', err)
    ok = false
  }

  console.log(
    '\nTest 2: attempt to add a plain parent to the MARRIED-IN anchor (should FAIL — must use linked-family-root instead)...',
  )
  try {
    const counterSnap = await adminDb.collection('meta').doc('id_counter').get()
    const nextSeq = counterSnap.data()!.nextSeq as number
    const rejectedId = `N-${String(nextSeq).padStart(4, '0')}`
    await setDoc(
      doc(db, 'people', rejectedId),
      await personDoc(rejectedId, {
        name: 'Should Not Exist',
        generation: 1,
        children: [MARRIED_IN_ANCHOR_ID],
        addedBy: BLOODLINE_ANCHOR_ID,
        addedAt: serverTimestamp(),
        isPlaceholderEmail: true,
        isBloodline: true,
        email: `no-email.${rejectedId.toLowerCase()}@thenahars.placeholder`,
      }),
    )
    console.error('FAIL — expected Test 2 to be rejected by rules, but it succeeded')
    ok = false
    await adminDb.collection('people').doc(rejectedId).delete()
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log(
    '\nTest 3: attempt to add a parent to the MARRIED-IN anchor claiming isBloodline == false (should also FAIL — newParentIsValid requires isBloodline == true regardless)...',
  )
  try {
    const counterSnap = await adminDb.collection('meta').doc('id_counter').get()
    const nextSeq = counterSnap.data()!.nextSeq as number
    const rejectedId = `N-${String(nextSeq).padStart(4, '0')}`
    await setDoc(
      doc(db, 'people', rejectedId),
      await personDoc(rejectedId, {
        name: 'Should Not Exist Either',
        generation: 1,
        children: [MARRIED_IN_ANCHOR_ID],
        addedBy: BLOODLINE_ANCHOR_ID,
        addedAt: serverTimestamp(),
        isPlaceholderEmail: true,
        isBloodline: false,
        email: `no-email.${rejectedId.toLowerCase()}@thenahars.placeholder`,
      }),
    )
    console.error('FAIL — expected Test 3 to be rejected by rules, but it succeeded')
    ok = false
    await adminDb.collection('people').doc(rejectedId).delete()
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log('\nCleaning up test fixtures...')
  await signOut(clientAuth)
  await adminDb.collection('people').doc(BLOODLINE_ANCHOR_ID).delete()
  await adminDb.collection('people').doc(MARRIED_IN_ANCHOR_ID).delete()
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).delete()
  if (bloodlineParentId) {
    await adminDb.collection('people').doc(bloodlineParentId).delete()
    await adminDb
      .collection('people_by_email')
      .doc(`no-email.${bloodlineParentId.toLowerCase()}@thenahars.placeholder`)
      .delete()
      .catch(() => {})
    const counterRef = adminDb.collection('meta').doc('id_counter')
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef)
      const current = snap.data()!.nextSeq as number
      tx.update(counterRef, { nextSeq: current - 1 })
    })
  }
  await adminAuth.deleteUser(authUser.uid)

  console.log(ok ? '\nAll tests passed.' : '\nSome tests FAILED — see above.')
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
