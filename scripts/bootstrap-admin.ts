/**
 * One-time per environment: links a Google email to a person record and
 * marks them admin, bypassing Firestore rules via the Admin SDK (required
 * for the very first admin, since no admin exists yet to satisfy the
 * rules' own isAdmin() check).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/bootstrap-admin.ts <nahar_id> <email>
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const [naharId, email] = process.argv.slice(2)
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!credentialsPath || !naharId || !email) {
  console.error(
    'Usage: GOOGLE_APPLICATION_CREDENTIALS=<path> npx tsx scripts/bootstrap-admin.ts <nahar_id> <email>',
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function bootstrap() {
  const personRef = db.collection('people').doc(naharId)
  const personSnap = await personRef.get()
  if (!personSnap.exists) {
    console.error(`No person with nahar_id "${naharId}" found in project "${serviceAccount.project_id}".`)
    process.exit(1)
  }

  const lowerEmail = email.toLowerCase()
  const batch = db.batch()
  batch.update(personRef, { email: lowerEmail, role: 'admin', claimed: true })
  batch.set(db.collection('people_by_email').doc(lowerEmail), { nahar_id: naharId })
  await batch.commit()

  console.log(`Linked ${email} -> ${naharId} as admin in project "${serviceAccount.project_id}".`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
