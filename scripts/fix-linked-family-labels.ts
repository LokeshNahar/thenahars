/**
 * One-off fix: linked-family roots created before the wording update still
 * carry the old auto-generated label ("Vanita's Family") written directly
 * to Firestore, e.g. by migrate-vanita-family.ts. The app-side fallback
 * (src/lib/linkedFamily.ts) only kicks in when NO label is stored — a
 * stored value always wins — so improving the fallback text alone doesn't
 * change what's already saved.
 *
 * This rewrites any stored linkedFamilyLabel that still matches the exact
 * old pattern ("{FirstName}'s Family") to the new wording
 * ("{FirstName}'s Side of the Family"), derived from the connecting
 * person's name (linkedFamilyOf), the same way the UI fallback does. Any
 * label an admin has since customized to something else entirely is left
 * untouched — this only targets the literal old default text.
 *
 * Safe to run multiple times (no-op once nothing matches the old pattern).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx tsx scripts/fix-linked-family-labels.ts
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

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function isOldDefaultLabel(label: string, anchorName: string): boolean {
  return label === `${firstName(anchorName)}'s Family`
}

function newLabel(anchorName: string): string {
  return `${firstName(anchorName)}'s Side of the Family`
}

async function main() {
  const rootsSnap = await db.collection('people').where('linkedFamilyOf', '!=', null).get()

  if (rootsSnap.empty) {
    console.log('No linked-family roots found — nothing to fix.')
    return
  }

  const batch = db.batch()
  let touched = 0

  for (const rootDoc of rootsSnap.docs) {
    const root = rootDoc.data()
    const label = root.linkedFamilyLabel as string | null | undefined
    const anchorId = root.linkedFamilyOf as string

    if (!label) continue

    const anchorSnap = await db.collection('people').doc(anchorId).get()
    const anchorName = anchorSnap.data()?.name as string | undefined
    if (!anchorName) continue

    if (isOldDefaultLabel(label, anchorName)) {
      const updated = newLabel(anchorName)
      batch.update(rootDoc.ref, { linkedFamilyLabel: updated })
      console.log(`  ${rootDoc.id}: "${label}" -> "${updated}"`)
      touched++
    }
  }

  if (touched === 0) {
    console.log('Nothing to fix — no stored labels match the old auto-generated pattern.')
    return
  }

  await batch.commit()
  console.log(`\nFixed ${touched} linked-family label(s) in project "${serviceAccount.project_id}".`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
