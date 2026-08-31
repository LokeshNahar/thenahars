import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import peopleJson from '../data/people.json'
import type { Person } from '../data/schema'
import { db } from './firebase'

const seedPeople = peopleJson as Person[]

export interface DataSource {
  getAllPeople(): Promise<Person[]>
  getPersonById(id: string): Promise<Person | null>
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
 */
class FirestoreDataSource implements DataSource {
  async getAllPeople(): Promise<Person[]> {
    if (!db) return seedPeople
    try {
      const snapshot = await getDocs(collection(db, 'people'))
      if (snapshot.empty) return seedPeople
      return snapshot.docs.map((d) => d.data() as Person)
    } catch (err) {
      console.error('Failed to load people from Firestore, falling back to seed data:', err)
      return seedPeople
    }
  }

  async getPersonById(id: string): Promise<Person | null> {
    if (!db) return seedPeople.find((p) => p.nahar_id === id) ?? null
    try {
      const snap = await getDoc(doc(db, 'people', id))
      if (snap.exists()) return snap.data() as Person
      return seedPeople.find((p) => p.nahar_id === id) ?? null
    } catch (err) {
      console.error(`Failed to load person ${id} from Firestore, falling back to seed data:`, err)
      return seedPeople.find((p) => p.nahar_id === id) ?? null
    }
  }
}

export const dataSource: DataSource = db ? new FirestoreDataSource() : new LocalJsonDataSource()
