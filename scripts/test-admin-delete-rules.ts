/**
 * Verifies admin-only delete of a person record, plus cleanup of a
 * relative's reverse-link and the person_by_email lookup — the batch shape
 * AdminPage.tsx's handleDelete uses. Also verifies a non-admin member is
 * rejected.
 *
 * Run against thenahars-dev only. Cleans up everything it creates.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   TEST_FIREBASE_API_KEY=<web api key from .env.local> \
 *     npx tsx scripts/test-admin-delete-rules.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { arrayRemove, doc, getFirestore, writeBatch } from 'firebase/firestore'

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

const ADMIN_EMAIL = 'test-admin-delete@example.com'
const MEMBER_EMAIL = 'test-nonadmin-delete@example.com'
const PARENT_ID = 'N-TEST-DEL-PARENT'
const CHILD_ID = 'N-TEST-DEL-CHILD'

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
  const adminUser = await adminAuth
    .getUserByEmail(ADMIN_EMAIL)
    .catch(() => adminAuth.createUser({ email: ADMIN_EMAIL, emailVerified: true }))
  const memberUser = await adminAuth
    .getUserByEmail(MEMBER_EMAIL)
    .catch(() => adminAuth.createUser({ email: MEMBER_EMAIL, emailVerified: true }))

  await adminDb
    .collection('people')
    .doc(PARENT_ID)
    .set(
      await personDoc(PARENT_ID, {
        name: 'Test Del Parent',
        email: ADMIN_EMAIL,
        claimed: true,
        role: 'admin',
        children: [CHILD_ID],
      }),
    )
  await adminDb
    .collection('people')
    .doc(CHILD_ID)
    .set(
      await personDoc(CHILD_ID, {
        name: 'Test Del Child (mistake)',
        email: 'no-email.n-test-del-child@thenahars.placeholder',
        isPlaceholderEmail: true,
        parents: [PARENT_ID],
      }),
    )
  await adminDb.collection('people_by_email').doc(ADMIN_EMAIL).set({ nahar_id: PARENT_ID })
  await adminDb
    .collection('people_by_email')
    .doc('no-email.n-test-del-child@thenahars.placeholder')
    .set({ nahar_id: CHILD_ID })
  await adminDb.collection('people_by_email').doc(MEMBER_EMAIL).set({ nahar_id: 'N-NONEXISTENT-MEMBER' })

  let ok = true

  console.log('\nTest 1: non-admin attempts to delete the child (should FAIL)...')
  try {
    const memberToken = await adminAuth.createCustomToken(memberUser.uid)
    await signInWithCustomToken(clientAuth, memberToken)
    await writeBatch(db)
      .delete(doc(db, 'people', CHILD_ID))
      .commit()
    console.error('FAIL — expected Test 1 to be rejected by rules, but it succeeded')
    ok = false
  } catch {
    console.log('PASS — rejected as expected (non-admin cannot delete)')
  } finally {
    await signOut(clientAuth)
  }

  console.log('\nTest 2: admin deletes the child, cleans up parent link and email lookup...')
  try {
    const adminToken = await adminAuth.createCustomToken(adminUser.uid)
    await signInWithCustomToken(clientAuth, adminToken)

    const batch = writeBatch(db)
    batch.update(doc(db, 'people', PARENT_ID), { children: arrayRemove(CHILD_ID) })
    batch.delete(doc(db, 'people_by_email', 'no-email.n-test-del-child@thenahars.placeholder'))
    batch.delete(doc(db, 'people', CHILD_ID))
    await batch.commit()

    const childSnap = await adminDb.collection('people').doc(CHILD_ID).get()
    const parentSnap = await adminDb.collection('people').doc(PARENT_ID).get()
    const emailSnap = await adminDb
      .collection('people_by_email')
      .doc('no-email.n-test-del-child@thenahars.placeholder')
      .get()

    const childGone = !childSnap.exists
    const parentClean = !(parentSnap.data()!.children as string[]).includes(CHILD_ID)
    const emailGone = !emailSnap.exists

    console.log(childGone ? 'PASS — child document deleted' : 'FAIL — child still exists')
    console.log(
      parentClean ? "PASS — removed from parent's children array" : 'FAIL — dangling reference remains',
    )
    console.log(emailGone ? 'PASS — people_by_email lookup deleted' : 'FAIL — lookup still exists')
    if (!childGone || !parentClean || !emailGone) ok = false
  } catch (err) {
    console.error('FAIL — expected Test 2 to succeed:', err)
    ok = false
  } finally {
    await signOut(clientAuth)
  }

  console.log('\nCleaning up test fixtures...')
  await adminDb.collection('people').doc(PARENT_ID).delete()
  await adminDb
    .collection('people')
    .doc(CHILD_ID)
    .delete()
    .catch(() => {})
  await adminDb.collection('people_by_email').doc(ADMIN_EMAIL).delete()
  await adminDb.collection('people_by_email').doc(MEMBER_EMAIL).delete()
  await adminDb
    .collection('people_by_email')
    .doc('no-email.n-test-del-child@thenahars.placeholder')
    .delete()
    .catch(() => {})
  await adminAuth.deleteUser(adminUser.uid)
  await adminAuth.deleteUser(memberUser.uid)

  console.log(ok ? '\nAll tests passed.' : '\nSome tests FAILED — see above.')
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
