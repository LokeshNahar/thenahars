/**
 * One-off migration: splits every existing people/{id} document into its
 * public shape (name, relationships, status — unchanged, stays readable by
 * any signed-in visitor) and a new people/{id}/private/details subdoc
 * holding everything sensitive (phone, email, dateOfBirth, marriageDate,
 * profession, qualification, location, photo, instagram, facebook,
 * linkedin, notes — readable only by admins and matched members). See
 * firestore.rules' file header for the full rationale.
 *
 * Safe to run more than once: for any person already split (their private
 * subdoc already exists), it's skipped — this only ever moves fields out
 * of the public doc, once. Must be run AFTER the new firestore.rules are
 * deployed (the split-out FieldValue.delete() writes rely on the updated
 * update rule's onlyPublicPersonalFieldsChanged() etc., though this script
 * itself uses the Admin SDK so it bypasses rules regardless — the
 * ordering matters for the APP, not this script, since the app's own
 * writes would otherwise target the old flat shape).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/migrate-split-private-fields.ts
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

const PRIVATE_FIELD_KEYS = [
  'phone',
  'dateOfBirth',
  'marriageDate',
  'email',
  'profession',
  'qualification',
  'location',
  'photo',
  'instagram',
  'facebook',
  'linkedin',
  'notes',
] as const

async function main() {
  const peopleSnap = await db.collection('people').get()
  console.log(`Found ${peopleSnap.size} people in project "${serviceAccount.project_id}".`)

  let migrated = 0
  let skipped = 0

  for (const personDoc of peopleSnap.docs) {
    const data = personDoc.data()
    const privateRef = personDoc.ref.collection('private').doc('details')
    const existingPrivate = await privateRef.get()

    if (existingPrivate.exists) {
      skipped++
      continue
    }

    const privatePayload: Record<string, unknown> = {}
    const publicFieldDeletes: Record<string, unknown> = {}
    let hadAnyPrivateField = false

    for (const key of PRIVATE_FIELD_KEYS) {
      if (key in data) {
        privatePayload[key] = data[key] ?? null
        publicFieldDeletes[key] = FieldValue.delete()
        hadAnyPrivateField = true
      } else {
        privatePayload[key] = null
      }
    }

    const batch = db.batch()
    batch.set(privateRef, privatePayload)
    if (hadAnyPrivateField) {
      batch.update(personDoc.ref, publicFieldDeletes)
    }
    await batch.commit()

    migrated++
    console.log(`  ${personDoc.id} (${data.name ?? 'unnamed'}) — split into public + private/details.`)
  }

  console.log(`\nDone. Migrated ${migrated}, already-split ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
