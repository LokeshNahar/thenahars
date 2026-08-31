/**
 * One-off migration: seeds a Firestore project's `people` collection from
 * the bundled src/data/people.json seed data. Run once per environment,
 * the first time that environment's Firestore is empty.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/seed-firestore.ts
 *
 * The service account key is downloaded from:
 *   Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
 * Never commit this key file. Delete it after seeding if you don't need it again.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialsPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON key.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
const people = JSON.parse(readFileSync(resolve(__dirname, '../src/data/people.json'), 'utf-8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function seed() {
  const existing = await db.collection('people').limit(1).get()
  if (!existing.empty) {
    console.error(
      `Project "${serviceAccount.project_id}" already has data in "people" — refusing to overwrite. ` +
        'Delete the collection manually first if you really want to re-seed.',
    )
    process.exit(1)
  }

  const batch = db.batch()
  for (const person of people) {
    batch.set(db.collection('people').doc(person.nahar_id), person)
    if (person.email) {
      batch.set(db.collection('people_by_email').doc(person.email.toLowerCase()), {
        nahar_id: person.nahar_id,
      })
    }
  }
  await batch.commit()

  console.log(`Seeded ${people.length} people into project "${serviceAccount.project_id}".`)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
