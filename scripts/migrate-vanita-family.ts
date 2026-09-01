/**
 * One-off data migration for thenahars-dev, addressing user-reported bugs:
 *
 * 1. Backfills the new `isBloodline` field on all existing people (born a
 *    Nahar = true; married in from outside = false).
 * 2. Fixes N-0009 (Vanita)'s parents (N-0012 Ganesh Mal Dugar, N-0013
 *    Sampat Devi Dugar) — they were added as plain main-tree `parents`
 *    entries instead of a linked-external-family branch. Converts N-0012
 *    into the proper linkedFamilyOf root (spouse N-0013, linkedFamilyLabel
 *    "Vanita's Family"), clears Vanita's own `parents` array (she's not
 *    reachable from the main tree via a parents edge — the branch is
 *    revealed via the toggle instead), and adds Vanita to N-0012/13's
 *    children so the branch reads as her actual family (read-only there,
 *    since FamilyTreeCanvas's readOnlyIds prevents expanding into the main
 *    tree from inside the takeover).
 * 3. Deletes N-0014, an accidental duplicate of Ganesh Mal Dugar created
 *    via "Link Another Family" before this fix existed.
 * 4. Adds Vanita's extended family within that branch: 2 brothers, 1
 *    sister, their spouses, and their children.
 *
 * Idempotent guard: checks N-0012.linkedFamilyOf before doing anything, so
 * running this twice is a no-op the second time.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/migrate-vanita-family.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialsPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS (service account JSON path).')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const BLOODLINE_TRUE = new Set([
  'N-0001',
  'N-0003',
  'N-0004',
  'N-0005',
  'N-0006',
  'N-0007',
  'N-0008',
  'N-0010',
  'N-0011',
])

function basePerson(overrides: Record<string, unknown>) {
  return {
    gender: 'other',
    generation: 2,
    parents: [],
    spouse: [],
    children: [],
    addedBy: 'N-0010',
    addedAt: FieldValue.serverTimestamp(),
    isPlaceholderEmail: true,
    isBloodline: false,
    linkedFamilyOf: null,
    linkedFamilyLabel: null,
    phone: null,
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

async function reserveId(): Promise<string> {
  const counterRef = db.collection('meta').doc('id_counter')
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const nextSeq = snap.data()!.nextSeq as number
    const id = `N-${String(nextSeq).padStart(4, '0')}`
    tx.update(counterRef, { nextSeq: nextSeq + 1 })
    return id
  })
}

function placeholderEmail(id: string): string {
  return `no-email.${id.toLowerCase()}@thenahars.placeholder`
}

async function main() {
  console.log('Step 1: backfill isBloodline on existing people...')
  const peopleSnap = await db.collection('people').get()
  const batch1 = db.batch()
  for (const doc of peopleSnap.docs) {
    if (doc.id === 'N-0014') continue // being deleted below
    const isBloodline = BLOODLINE_TRUE.has(doc.id)
    batch1.update(doc.ref, { isBloodline })
  }
  await batch1.commit()
  console.log('  done.')

  console.log('\nStep 2: check idempotency guard...')
  const n12Before = await db.collection('people').doc('N-0012').get()
  if (n12Before.data()?.linkedFamilyOf === 'N-0009') {
    console.log('  N-0012 already converted to a linked-family root — migration already ran. Exiting.')
    return
  }
  console.log('  not yet converted, proceeding.')

  console.log('\nStep 3: convert N-0012/N-0013 into the linked-family root couple, fix Vanita...')
  const batch2 = db.batch()
  batch2.update(db.collection('people').doc('N-0012'), {
    spouse: ['N-0013'],
    children: FieldValue.arrayUnion('N-0009'),
    linkedFamilyOf: 'N-0009',
    linkedFamilyLabel: "Vanita's Family",
    isBloodline: false,
  })
  batch2.update(db.collection('people').doc('N-0013'), {
    spouse: ['N-0012'],
    children: FieldValue.arrayUnion('N-0009'),
    isBloodline: false,
  })
  batch2.update(db.collection('people').doc('N-0009'), {
    parents: [],
  })
  await batch2.commit()
  console.log('  done.')

  console.log('\nStep 4: delete duplicate N-0014...')
  const n14 = await db.collection('people').doc('N-0014').get()
  if (n14.exists) {
    const email = n14.data()!.email as string | null
    const batch3 = db.batch()
    batch3.delete(db.collection('people').doc('N-0014'))
    if (email) batch3.delete(db.collection('people_by_email').doc(email.toLowerCase()))
    await batch3.commit()
    console.log('  deleted N-0014 and its email lookup.')
  } else {
    console.log('  N-0014 already gone, skipping.')
  }

  console.log("\nStep 5: create Vanita's extended family...")

  // Sister: Lalita Bhura + Paras Bhura, 2 sons.
  const lalitaId = await reserveId()
  const parasId = await reserveId()
  const ankitId = await reserveId()
  const vipulId = await reserveId()
  await db
    .collection('people')
    .doc(lalitaId)
    .set(
      basePerson({
        nahar_id: lalitaId,
        name: 'Lalita Bhura',
        gender: 'female',
        parents: ['N-0012', 'N-0013'],
        spouse: [parasId],
        children: [ankitId, vipulId],
        email: placeholderEmail(lalitaId),
      }),
    )
  await db
    .collection('people')
    .doc(parasId)
    .set(
      basePerson({
        nahar_id: parasId,
        name: 'Paras Bhura',
        gender: 'male',
        spouse: [lalitaId],
        children: [ankitId, vipulId],
        email: placeholderEmail(parasId),
      }),
    )
  await db
    .collection('people')
    .doc(ankitId)
    .set(
      basePerson({
        nahar_id: ankitId,
        name: 'Ankit Bhura',
        gender: 'male',
        generation: 3,
        parents: [parasId, lalitaId],
        email: placeholderEmail(ankitId),
      }),
    )
  await db
    .collection('people')
    .doc(vipulId)
    .set(
      basePerson({
        nahar_id: vipulId,
        name: 'Vipul Bhura',
        gender: 'male',
        generation: 3,
        parents: [parasId, lalitaId],
        email: placeholderEmail(vipulId),
      }),
    )
  console.log(`  Sister's family: ${lalitaId} Lalita, ${parasId} Paras, ${ankitId} Ankit, ${vipulId} Vipul.`)

  // Brother 1: Gautam Dugar + Anita Dugar, 3 children.
  const gautamId = await reserveId()
  const anitaId = await reserveId()
  const harshId = await reserveId()
  const juhiId = await reserveId()
  const garimaId = await reserveId()
  await db
    .collection('people')
    .doc(gautamId)
    .set(
      basePerson({
        nahar_id: gautamId,
        name: 'Gautam Dugar',
        gender: 'male',
        parents: ['N-0012', 'N-0013'],
        spouse: [anitaId],
        children: [harshId, juhiId, garimaId],
        email: placeholderEmail(gautamId),
      }),
    )
  await db
    .collection('people')
    .doc(anitaId)
    .set(
      basePerson({
        nahar_id: anitaId,
        name: 'Anita Dugar',
        gender: 'female',
        spouse: [gautamId],
        children: [harshId, juhiId, garimaId],
        email: placeholderEmail(anitaId),
      }),
    )
  await db
    .collection('people')
    .doc(harshId)
    .set(
      basePerson({
        nahar_id: harshId,
        name: 'Harsh Dugar',
        gender: 'male',
        generation: 3,
        parents: [gautamId, anitaId],
        email: placeholderEmail(harshId),
      }),
    )
  await db
    .collection('people')
    .doc(juhiId)
    .set(
      basePerson({
        nahar_id: juhiId,
        name: 'Juhi Dugar',
        gender: 'female',
        generation: 3,
        parents: [gautamId, anitaId],
        email: placeholderEmail(juhiId),
      }),
    )
  await db
    .collection('people')
    .doc(garimaId)
    .set(
      basePerson({
        nahar_id: garimaId,
        name: 'Garima Dugar',
        gender: 'female',
        generation: 3,
        parents: [gautamId, anitaId],
        email: placeholderEmail(garimaId),
      }),
    )
  console.log(
    `  Brother 1's family: ${gautamId} Gautam, ${anitaId} Anita, ${harshId} Harsh, ${juhiId} Juhi, ${garimaId} Garima.`,
  )

  // Brother 2: Uttam Dugar + Aruna Dugar, daughter Khushi + son Kavya.
  const uttamId = await reserveId()
  const arunaId = await reserveId()
  const khushiId = await reserveId()
  const kavyaId = await reserveId()
  await db
    .collection('people')
    .doc(uttamId)
    .set(
      basePerson({
        nahar_id: uttamId,
        name: 'Uttam Dugar',
        gender: 'male',
        parents: ['N-0012', 'N-0013'],
        spouse: [arunaId],
        children: [khushiId, kavyaId],
        email: placeholderEmail(uttamId),
      }),
    )
  await db
    .collection('people')
    .doc(arunaId)
    .set(
      basePerson({
        nahar_id: arunaId,
        name: 'Aruna Dugar',
        gender: 'female',
        spouse: [uttamId],
        children: [khushiId, kavyaId],
        email: placeholderEmail(arunaId),
      }),
    )
  await db
    .collection('people')
    .doc(khushiId)
    .set(
      basePerson({
        nahar_id: khushiId,
        name: 'Khushi Dugar',
        gender: 'female',
        generation: 3,
        parents: [uttamId, arunaId],
        email: placeholderEmail(khushiId),
      }),
    )
  await db
    .collection('people')
    .doc(kavyaId)
    .set(
      basePerson({
        nahar_id: kavyaId,
        name: 'Kavya Dugar',
        gender: 'male',
        generation: 3,
        parents: [uttamId, arunaId],
        email: placeholderEmail(kavyaId),
      }),
    )
  console.log(
    `  Brother 2's family: ${uttamId} Uttam, ${arunaId} Aruna, ${khushiId} Khushi, ${kavyaId} Kavya.`,
  )

  console.log('\nStep 6: register people_by_email lookups for everyone just created...')
  const newIds = [
    lalitaId,
    parasId,
    ankitId,
    vipulId,
    gautamId,
    anitaId,
    harshId,
    juhiId,
    garimaId,
    uttamId,
    arunaId,
    khushiId,
    kavyaId,
  ]
  const batch4 = db.batch()
  for (const id of newIds) {
    batch4.set(db.collection('people_by_email').doc(placeholderEmail(id)), { nahar_id: id })
  }
  await batch4.commit()
  console.log('  done.')

  console.log('\nStep 7: add all four siblings to N-0012/N-0013 children (Vanita already added in step 3)...')
  await db
    .collection('people')
    .doc('N-0012')
    .update({
      children: FieldValue.arrayUnion(lalitaId, gautamId, uttamId),
    })
  await db
    .collection('people')
    .doc('N-0013')
    .update({
      children: FieldValue.arrayUnion(lalitaId, gautamId, uttamId),
    })
  console.log('  done.')

  console.log('\nMigration complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
