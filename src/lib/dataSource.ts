import peopleJson from '../data/people.json'
import type { Person } from '../data/schema'

const people = peopleJson as Person[]

export interface DataSource {
  getAllPeople(): Promise<Person[]>
  getPersonById(id: string): Promise<Person | null>
}

/**
 * Phase 1 data source: reads the bundled JSON seed data.
 * Phase 2 will add a FirestoreDataSource behind this same interface —
 * consumers should only ever go through usePeople(), never import
 * people.json directly, so that swap touches nothing else.
 */
class LocalJsonDataSource implements DataSource {
  async getAllPeople(): Promise<Person[]> {
    return people
  }

  async getPersonById(id: string): Promise<Person | null> {
    return people.find((p) => p.nahar_id === id) ?? null
  }
}

export const dataSource: DataSource = new LocalJsonDataSource()
