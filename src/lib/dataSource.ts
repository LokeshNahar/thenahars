import { collection, collectionGroup, doc, getDoc, getDocs } from 'firebase/firestore'
import peopleJson from '../data/people.json'
import { PRIVATE_FIELD_KEYS, type Person, type PrivatePersonDetails, type PublicPerson } from '../data/schema'
import { db } from './firebase'

const seedPeople = peopleJson as Person[]

export interface DataSource {
  getAllPeople(): Promise<Person[]>
  getPersonById(id: string): Promise<Person | null>
}

/** Every PrivatePersonDetails field as null — what an unmatched/anonymous reader gets, since they were never sent the real values. */
function emptyPrivateDetails(): PrivatePersonDetails {
  const empty: Record<string, unknown> = {}
  for (const key of PRIVATE_FIELD_KEYS) {
    empty[key] = key === 'notes' ? undefined : null
  }
  return empty as unknown as PrivatePersonDetails
}

function mergePersonDocs(pub: PublicPerson, priv: PrivatePersonDetails | undefined): Person {
  return { ...pub, ...(priv ?? emptyPrivateDetails()) }
}

/** Reads the bundled JSON seed data. Used when Firebase isn't configured. */
class LocalJsonDataSource implements DataSource {
  async getAllPeople(): Promise<Person[]> {
    return seedPeople
  }

  async getPersonById(id: string): Promise<Person | null> {
    return seedPeople.find((p) => p.nahar_id === id) ?? null
  }
}

/**
 * Once an environment's Firestore has been seeded, it's the live source of
 * truth for everything — edits made through the app show up immediately
 * for every reader. Falls back to the bundled JSON only if Firestore has
 * never been seeded (empty collection) or a read fails, so local dev and
 * a not-yet-seeded environment still render something.
 *
 * Each person is now split across two documents — see firestore.rules'
 * file header for why: `people/{id}` (public: name, relationships,
 * status) and `people/{id}/private/details` (phone, email, DOB, location,
 * etc. — readable only by admins and matched members). This class fetches
 * both and merges them into the full Person shape every component already
 * expects. A caller who can't read the private subcollection (unmatched
 * or anonymous) simply gets an empty result set back from that query —
 * Firestore denies individual reads outside a rule, not the whole
 * request — so missing private docs resolve to null-filled fields rather
 * than an error, exactly mirroring what "this person's contact details
 * are hidden from you" already meant before the split.
 */
class FirestoreDataSource implements DataSource {
  async getAllPeople(): Promise<Person[]> {
    if (!db) return seedPeople
    try {
      const publicSnap = await getDocs(collection(db, 'people'))
      if (publicSnap.empty) return seedPeople

      const privateById = await this.fetchAllPrivateDetails()

      return publicSnap.docs.map((d) => {
        const pub = d.data() as PublicPerson
        return mergePersonDocs(pub, privateById.get(pub.nahar_id))
      })
    } catch (err) {
      console.error('Failed to load people from Firestore, falling back to seed data:', err)
      return seedPeople
    }
  }

  async getPersonById(id: string): Promise<Person | null> {
    if (!db) return seedPeople.find((p) => p.nahar_id === id) ?? null
    try {
      const naharDb = db
      const publicSnap = await getDoc(doc(naharDb, 'people', id))
      if (!publicSnap.exists()) return seedPeople.find((p) => p.nahar_id === id) ?? null

      const pub = publicSnap.data() as PublicPerson
      // A single-person fetch can afford a direct subdoc read (vs. the
      // collection-group query used for the full list) — denied by rules
      // just as gracefully: getDoc() on a doc the caller can't read
      // rejects the promise, so this is wrapped the same way as the
      // outer try/catch, falling through to an empty-private merge.
      const priv = await getDoc(doc(naharDb, 'people', id, 'private', 'details')).catch(() => null)
      return mergePersonDocs(pub, priv?.exists() ? (priv.data() as PrivatePersonDetails) : undefined)
    } catch (err) {
      console.error(`Failed to load person ${id} from Firestore, falling back to seed data:`, err)
      return seedPeople.find((p) => p.nahar_id === id) ?? null
    }
  }

  /**
   * One collection-group query for every private/details doc the caller
   * is allowed to see, rather than one getDoc() per person — Firestore
   * rules apply per-document within the query results, so an unmatched
   * caller simply gets an empty snapshot back (not an error) if they
   * can't read the collection at all, and a matched member/admin gets
   * every doc in one round trip.
   */
  private async fetchAllPrivateDetails(): Promise<Map<string, PrivatePersonDetails>> {
    const naharDb = db
    if (!naharDb) return new Map()
    try {
      const snap = await getDocs(collectionGroup(naharDb, 'private'))
      const byId = new Map<string, PrivatePersonDetails>()
      for (const d of snap.docs) {
        // Path shape: people/{naharId}/private/details — the parent of the
        // parent segment is the naharId this subdoc belongs to.
        const naharId = d.ref.parent.parent?.id
        if (naharId) byId.set(naharId, d.data() as PrivatePersonDetails)
      }
      return byId
    } catch (err) {
      // An unmatched/anonymous caller is denied the whole collection-group
      // read by rules — that's expected, not a real error; every person
      // just renders with null-filled private fields.
      console.warn('Private person details not readable in this session (expected if unmatched):', err)
      return new Map()
    }
  }
}

export const dataSource: DataSource = db ? new FirestoreDataSource() : new LocalJsonDataSource()
