/**
 * One-off migration: adds Dalchand Nahar's branch to an existing Firestore
 * project — renames the N-0003 placeholder (son 1 of 4) to Dalchand, adds
 * his wife Sajjan, and their two sons Ankur (+ wife Aastha) and Pranjal.
 *
 * Ankur and Aastha are added as name-only stubs (matching the pattern
 * already used for other undetailed family members) so the pending claim
 * for "Ankur Nahar" (father "Dalchand Nahar", mother "Sajjan Nahar") in
 * uat's pending_claims can resolve via findClaimCandidates — see
 * src/lib/claimMatching.ts. Full details for Ankur/Aastha/Pranjal are
 * expected to be backfilled later via AdminPage once provided.
 *
 * Usage:
 *   CRED=/path/to/service-account.json npx tsx scripts/migrate-dalchand-family.ts [--dry-run]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const dryRun = process.argv.includes('--dry-run')

const credentialsPath = process.env.CRED
if (!credentialsPath) {
  console.error('Set CRED to the path of your service account JSON key.')
  process.exit(1)
}
const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const DALCHAND_ID = 'N-0003'
const SAJJAN_ID = 'N-0028'
const ANKUR_ID = 'N-0029'
const AASTHA_ID = 'N-0030'
const PRANJAL_ID = 'N-0031'

const emptyPrivate = {
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
}

async function main() {
  const dalchandRef = db.collection('people').doc(DALCHAND_ID)
  const dalchandSnap = await dalchandRef.get()
  if (!dalchandSnap.exists) {
    console.error(`${DALCHAND_ID} does not exist — refusing to run.`)
    process.exit(1)
  }
  const dalchandData = dalchandSnap.data()!
  if (dalchandData.name !== 'Details coming soon') {
    console.error(`${DALCHAND_ID} is not a placeholder (name: "${dalchandData.name}") — refusing to overwrite.`)
    process.exit(1)
  }

  for (const id of [SAJJAN_ID, ANKUR_ID, AASTHA_ID, PRANJAL_ID]) {
    const existing = await db.collection('people').doc(id).get()
    if (existing.exists) {
      console.error(`${id} already exists (name: "${existing.data()?.name}") — refusing to overwrite.`)
      process.exit(1)
    }
  }

  console.log(`Target project: ${serviceAccount.project_id}${dryRun ? ' (dry run — no writes)' : ''}`)

  const batch = db.batch()

  // Dalchand: rename placeholder N-0003, link spouse Sajjan.
  batch.update(dalchandRef, {
    name: 'Dalchand Nahar',
    spouse: [SAJJAN_ID],
    children: [ANKUR_ID, PRANJAL_ID],
    notes: '',
  })

  // Sajjan Nahar — married in, no parents in this tree.
  batch.set(db.collection('people').doc(SAJJAN_ID), {
    nahar_id: SAJJAN_ID,
    name: 'Sajjan Nahar',
    gender: 'female',
    generation: 2,
    parents: [],
    spouse: [DALCHAND_ID],
    children: [ANKUR_ID, PRANJAL_ID],
    addedBy: null,
    addedAt: null,
    isPlaceholderEmail: false,
    isBloodline: false,
    linkedFamilyOf: null,
    linkedFamilyLabel: null,
    status: 'living',
    claimed: false,
    role: 'member',
  })
  batch.set(db.collection('people').doc(SAJJAN_ID).collection('private').doc('details'), {
    ...emptyPrivate,
    notes: 'Married into the Nahar family; birth family not part of this tree.',
  })

  // Ankur Nahar — bloodline son, real name so the pending claim can match.
  batch.set(db.collection('people').doc(ANKUR_ID), {
    nahar_id: ANKUR_ID,
    name: 'Ankur Nahar',
    gender: 'male',
    generation: 3,
    parents: [DALCHAND_ID, SAJJAN_ID],
    spouse: [AASTHA_ID],
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
  })
  batch.set(db.collection('people').doc(ANKUR_ID).collection('private').doc('details'), {
    ...emptyPrivate,
    notes: 'Awaiting details — pending claim received.',
  })

  // Aastha Nahar — married in (wife of Ankur), no parents in this tree.
  batch.set(db.collection('people').doc(AASTHA_ID), {
    nahar_id: AASTHA_ID,
    name: 'Aastha Nahar',
    gender: 'female',
    generation: 3,
    parents: [],
    spouse: [ANKUR_ID],
    children: [],
    addedBy: null,
    addedAt: null,
    isPlaceholderEmail: false,
    isBloodline: false,
    linkedFamilyOf: null,
    linkedFamilyLabel: null,
    status: 'living',
    claimed: false,
    role: 'member',
  })
  batch.set(db.collection('people').doc(AASTHA_ID).collection('private').doc('details'), {
    ...emptyPrivate,
    notes: 'Married into the Nahar family; birth family not part of this tree.',
  })

  // Pranjal Nahar — bloodline son.
  batch.set(db.collection('people').doc(PRANJAL_ID), {
    nahar_id: PRANJAL_ID,
    name: 'Pranjal Nahar',
    gender: 'male',
    generation: 3,
    parents: [DALCHAND_ID, SAJJAN_ID],
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
  })
  batch.set(db.collection('people').doc(PRANJAL_ID).collection('private').doc('details'), emptyPrivate)

  if (dryRun) {
    console.log('Dry run — would write: Dalchand (update), Sajjan, Ankur, Aastha, Pranjal (create).')
    return
  }

  await batch.commit()
  console.log(`Added Dalchand's branch to "${serviceAccount.project_id}": ${SAJJAN_ID}, ${ANKUR_ID}, ${AASTHA_ID}, ${PRANJAL_ID}; renamed ${DALCHAND_ID}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
