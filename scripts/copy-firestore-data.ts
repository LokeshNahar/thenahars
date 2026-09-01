/**
 * One-off migration: copies all documents (recursively, including
 * subcollections like people/{id}/private/details) from one Firestore
 * project into another. Intended for copying thenahars-dev's data into
 * thenahars-uat.
 *
 * Run locally — never in CI — with two separate service account keys:
 *
 *   SOURCE_CREDENTIALS=/path/to/thenahars-dev-key.json \
 *   TARGET_CREDENTIALS=/path/to/thenahars-uat-key.json \
 *     npx tsx scripts/copy-firestore-data.ts [--dry-run] [--force]
 *
 * Service account keys are downloaded from:
 *   Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
 * Never commit these key files. Delete them after use.
 *
 * By default this script refuses to run if the target project already has
 * documents in any of the known top-level collections, to avoid silently
 * clobbering existing uat data. Pass --force to wipe and overwrite anyway.
 * Pass --dry-run to see what would be copied without writing anything.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore, type CollectionReference } from 'firebase-admin/firestore'

const TOP_LEVEL_COLLECTIONS = ['people', 'people_by_email', 'pending_claims', 'meta']

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

function loadDb(envVar: string): { db: Firestore; projectId: string } {
  const credentialsPath = process.env[envVar]
  if (!credentialsPath) {
    console.error(`Set ${envVar} to the path of a service account JSON key.`)
    process.exit(1)
  }
  const serviceAccount = JSON.parse(readFileSync(resolve(credentialsPath), 'utf-8'))
  const app = initializeApp({ credential: cert(serviceAccount) }, envVar)
  return { db: getFirestore(app), projectId: serviceAccount.project_id }
}

async function copyCollection(source: CollectionReference, target: CollectionReference): Promise<number> {
  const snapshot = await source.get()
  let count = 0
  let batch = target.firestore.batch()
  let opsInBatch = 0

  for (const doc of snapshot.docs) {
    if (!dryRun) {
      batch.set(target.doc(doc.id), doc.data())
      opsInBatch++
      if (opsInBatch >= 400) {
        await batch.commit()
        batch = target.firestore.batch()
        opsInBatch = 0
      }
    }
    count++

    for (const subcol of await doc.ref.listCollections()) {
      count += await copyCollection(subcol, target.doc(doc.id).collection(subcol.id))
    }
  }

  if (!dryRun && opsInBatch > 0) await batch.commit()
  return count
}

async function deleteCollection(col: CollectionReference): Promise<void> {
  const snapshot = await col.get()
  for (const doc of snapshot.docs) {
    for (const subcol of await doc.ref.listCollections()) {
      await deleteCollection(subcol)
    }
    await doc.ref.delete()
  }
}

async function main() {
  const { db: sourceDb, projectId: sourceProjectId } = loadDb('SOURCE_CREDENTIALS')
  const { db: targetDb, projectId: targetProjectId } = loadDb('TARGET_CREDENTIALS')

  if (sourceProjectId === targetProjectId) {
    console.error('Source and target credentials point at the same project — refusing to run.')
    process.exit(1)
  }

  console.log(`Source: ${sourceProjectId}`)
  console.log(`Target: ${targetProjectId}${dryRun ? ' (dry run — no writes)' : ''}`)

  for (const name of TOP_LEVEL_COLLECTIONS) {
    const existing = await targetDb.collection(name).limit(1).get()
    if (!existing.empty && !force && !dryRun) {
      console.error(
        `Target project "${targetProjectId}" already has data in "${name}" — refusing to overwrite. ` +
          'Pass --force to wipe and replace it.',
      )
      process.exit(1)
    }
  }

  for (const name of TOP_LEVEL_COLLECTIONS) {
    if (force && !dryRun) {
      console.log(`Deleting existing "${name}" in target...`)
      await deleteCollection(targetDb.collection(name))
    }
    const copied = await copyCollection(sourceDb.collection(name), targetDb.collection(name))
    console.log(`${dryRun ? 'Would copy' : 'Copied'} ${copied} document(s) in "${name}" (incl. subcollections).`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
