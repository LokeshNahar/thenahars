/**
 * Exercises the linked-family-root Firestore rules as a real signed-in
 * client would — not an Admin SDK bypass. Verifies:
 *   1. A linked member can create a linkedFamilyOf-rooted person anchored
 *      on themself (single commit — no reverse-link step, since nothing
 *      points back at a linked root by design).
 *   2. The people_by_email doc for the new root can be created.
 *   3. That same member CANNOT create a linked-family root anchored on an
 *      unrelated stranger.
 *   4. findRootId-equivalent check: the linked root is NOT reachable via
 *      parents/spouse/children traversal from the main tree (it has empty
 *      relationship arrays and only linkedFamilyOf set).
 *
 * Cleans up everything it creates. Run against thenahars-dev only.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-linked-family-rules.ts
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

const TEST_EMAIL = 'test-linked-family-verify@example.com'
const ANCHOR_ID = 'N-TEST-ANCHOR'
const STRANGER_ID = 'N-TEST-STRANGER-LF'

async function personDoc(id: string, overrides: Record<string, unknown>) {
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
    .doc(ANCHOR_ID)
    .set(await personDoc(ANCHOR_ID, { name: 'Test Anchor', email: TEST_EMAIL, claimed: true }))
  await adminDb
    .collection('people')
    .doc(STRANGER_ID)
    .set(await personDoc(STRANGER_ID, { name: 'Test Stranger' }))
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).set({ nahar_id: ANCHOR_ID })

  console.log('Signing in as the test client...')
  const customToken = await adminAuth.createCustomToken(authUser.uid)
  await signInWithCustomToken(clientAuth, customToken)
  console.log('Signed in as', clientAuth.currentUser?.uid)

  let rootId: string | null = null
  let ok = true

  try {
    console.log("\nTest 1: create a linked-family root anchored on self (Test Anchor's mother)...")
    rootId = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'meta', 'id_counter')
      const counterSnap = await tx.get(counterRef)
      const nextSeq = counterSnap.data()!.nextSeq as number
      const newId = `N-${String(nextSeq).padStart(4, '0')}`
      tx.update(counterRef, { nextSeq: nextSeq + 1 })
      tx.set(
        doc(db, 'people', newId),
        await personDoc(newId, {
          name: 'Test Linked Root',
          generation: 1,
          addedBy: ANCHOR_ID,
          addedAt: serverTimestamp(),
          isPlaceholderEmail: true,
          linkedFamilyOf: ANCHOR_ID,
          linkedFamilyLabel: "Anchor's Family",
          email: `no-email.${newId.toLowerCase()}@thenahars.placeholder`,
        }),
      )
      return newId
    })
    console.log('PASS — created', rootId)

    console.log('\nTest 2: separate commit — create people_by_email for the new root...')
    await setDoc(doc(db, 'people_by_email', `no-email.${rootId.toLowerCase()}@thenahars.placeholder`), {
      nahar_id: rootId,
    })
    console.log('PASS')
  } catch (err) {
    console.error('FAIL — expected Tests 1-2 to succeed:', err)
    ok = false
  }

  console.log(
    '\nTest 3: attempt to create a linked-family root anchored on an unrelated stranger (should fail)...',
  )
  try {
    await setDoc(
      doc(db, 'people', 'N-TEST-LF-SHOULD-FAIL'),
      await personDoc('N-TEST-LF-SHOULD-FAIL', {
        name: 'Should Not Exist',
        generation: 1,
        addedBy: ANCHOR_ID,
        addedAt: serverTimestamp(),
        isPlaceholderEmail: true,
        linkedFamilyOf: STRANGER_ID,
        linkedFamilyLabel: "Stranger's Family",
        email: 'no-email.n-test-lf-should-fail@thenahars.placeholder',
      }),
    )
    console.error('FAIL — expected Test 3 to be rejected by rules, but it succeeded')
    ok = false
    await adminDb.collection('people').doc('N-TEST-LF-SHOULD-FAIL').delete()
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log('\nTest 4: confirm the linked root is unreachable from the main tree traversal...')
  if (rootId) {
    const rootSnap = await adminDb.collection('people').doc(rootId).get()
    const data = rootSnap.data()!
    const isolated =
      (data.parents as unknown[]).length === 0 &&
      (data.spouse as unknown[]).length === 0 &&
      (data.children as unknown[]).length === 0 &&
      data.linkedFamilyOf === ANCHOR_ID
    if (isolated) {
      console.log('PASS — linked root has no parents/spouse/children edges into the main tree')
    } else {
      console.error('FAIL — linked root has unexpected relationship-array entries:', data)
      ok = false
    }
  }

  console.log('\nCleaning up test fixtures...')
  await signOut(clientAuth)
  await adminDb.collection('people').doc(ANCHOR_ID).delete()
  await adminDb.collection('people').doc(STRANGER_ID).delete()
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).delete()
  if (rootId) {
    await adminDb.collection('people').doc(rootId).delete()
    await adminDb
      .collection('people_by_email')
      .doc(`no-email.${rootId.toLowerCase()}@thenahars.placeholder`)
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
