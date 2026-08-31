/**
 * One-off backfill: adds instagram/facebook/linkedin: null to any existing
 * `people` documents that predate those fields being added to the schema.
 * Safe to run multiple times (only touches docs missing the fields).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/backfill-social-fields.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialsPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON key.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function backfill() {
  const snapshot = await db.collection('people').get()
  const batch = db.batch()
  let touched = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const update: Record<string, null> = {}
    if (!('instagram' in data)) update.instagram = null
    if (!('facebook' in data)) update.facebook = null
    if (!('linkedin' in data)) update.linkedin = null
    if (Object.keys(update).length > 0) {
      batch.update(doc.ref, update)
      touched++
    }
  }

  if (touched === 0) {
    console.log('Nothing to backfill — all documents already have the fields.')
    return
  }

  await batch.commit()
  console.log(`Backfilled ${touched} document(s) in project "${serviceAccount.project_id}".`)
}

backfill().catch((err) => {
  console.error(err)
  process.exit(1)
})
