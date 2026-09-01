/**
 * Exercises the add-person Firestore rules as a real signed-in client
 * would — not an Admin SDK bypass. Verifies:
 *   1. A linked member can create their own child (id-counter transaction).
 *   2. The reverse-link update (splicing the new child into the parent's
 *      `children` array) succeeds as a SEPARATE commit — see the note
 *      below on why this can't be one atomic operation.
 *   3. The people_by_email doc for the new person can be created.
 *   4. That same member CANNOT create a person anchored on an unrelated
 *      stranger.
 *
 * IMPORTANT — two-commit design, not one transaction: Firestore security
 * rules' get()/exists() calls cannot see another write from the SAME
 * atomic commit (transaction or batch). Since the reverse-link update's
 * rule needs to get() the newly-created person to verify `addedBy`,
 * "create the person" and "link them into the anchor" must be two
 * sequential commits, not one. This was discovered by testing against
 * real deployed rules (identical create+update pairs fail together via
 * both runTransaction and writeBatch, but succeed independently) — see
 * PHASE2-ADD-PERSON-PLAN.md for the full account. Do not try to
 * "optimize" this back into one transaction without re-verifying against
 * real rules first.
 *
 * Cleans up everything it creates. Run against thenahars-dev only.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-add-person-rules.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { doc, getFirestore, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

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

const TEST_EMAIL = 'test-rules-verify@example.com'
const PARENT_ID = 'N-TEST-PARENT'
const STRANGER_ID = 'N-TEST-STRANGER'

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
    .doc(PARENT_ID)
    .set(
      await personDoc(PARENT_ID, {
        name: 'Test Parent',
        email: TEST_EMAIL,
        claimed: true,
        isBloodline: true,
      }),
    )
  await adminDb
    .collection('people')
    .doc(STRANGER_ID)
    .set(await personDoc(STRANGER_ID, { name: 'Test Stranger' }))
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).set({ nahar_id: PARENT_ID })

  console.log('Signing in as the test client...')
  const customToken = await adminAuth.createCustomToken(authUser.uid)
  await signInWithCustomToken(clientAuth, customToken)
  console.log('Signed in as', clientAuth.currentUser?.uid)

  let childId: string | null = null
  let ok = true

  try {
    console.log('\nTest 1: create own child (id-counter transaction)...')
    childId = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'meta', 'id_counter')
      const counterSnap = await tx.get(counterRef)
      const nextSeq = counterSnap.data()!.nextSeq as number
      const newId = `N-${String(nextSeq).padStart(4, '0')}`
      tx.update(counterRef, { nextSeq: nextSeq + 1 })
      tx.set(
        doc(db, 'people', newId),
        await personDoc(newId, {
          name: 'Test Child',
          generation: 2,
          parents: [PARENT_ID],
          addedBy: PARENT_ID,
          addedAt: serverTimestamp(),
          isPlaceholderEmail: true,
          email: `no-email.${newId.toLowerCase()}@thenahars.placeholder`,
        }),
      )
      return newId
    })
    console.log('PASS — created', childId)

    console.log('\nTest 2: separate commit — splice child into parent.children...')
    await updateDoc(doc(db, 'people', PARENT_ID), { children: [childId] })
    console.log('PASS')

    console.log('\nTest 3: separate commit — create people_by_email for the new child...')
    await setDoc(doc(db, 'people_by_email', `no-email.${childId.toLowerCase()}@thenahars.placeholder`), {
      nahar_id: childId,
    })
    console.log('PASS')
  } catch (err) {
    console.error('FAIL — expected Tests 1-3 to succeed:', err)
    ok = false
  }

  console.log('\nTest 4: attempt to create a child anchored on an unrelated stranger (should fail)...')
  try {
    await setDoc(
      doc(db, 'people', 'N-TEST-SHOULD-FAIL'),
      await personDoc('N-TEST-SHOULD-FAIL', {
        name: 'Should Not Exist',
        generation: 2,
        parents: [STRANGER_ID],
        addedBy: PARENT_ID,
        addedAt: serverTimestamp(),
        isPlaceholderEmail: true,
        email: 'no-email.n-test-should-fail@thenahars.placeholder',
      }),
    )
    console.error('FAIL — expected Test 4 to be rejected by rules, but it succeeded')
    ok = false
    await adminDb.collection('people').doc('N-TEST-SHOULD-FAIL').delete()
  } catch {
    console.log('PASS — rejected as expected')
  }

  console.log('\nCleaning up test fixtures...')
  await signOut(clientAuth)
  await adminDb.collection('people').doc(PARENT_ID).delete()
  await adminDb.collection('people').doc(STRANGER_ID).delete()
  await adminDb.collection('people_by_email').doc(TEST_EMAIL).delete()
  if (childId) {
    await adminDb.collection('people').doc(childId).delete()
    await adminDb
      .collection('people_by_email')
      .doc(`no-email.${childId.toLowerCase()}@thenahars.placeholder`)
      .delete()
      .catch(() => {})
    // Restore the counter to undo this test run's reservation.
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
