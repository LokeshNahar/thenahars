import type { AuthUser } from '../context/AuthContext'
import type { Person } from '../data/schema'

/** Personal fields any authorized editor (self/relative/admin) may change. */
export const EDITABLE_PERSONAL_FIELDS = [
  'name',
  'phone',
  'email',
  'profession',
  'qualification',
  'location',
  'photo',
  'instagram',
  'facebook',
  'linkedin',
  'status',
  'notes',
] as const

export type EditablePersonalField = (typeof EDITABLE_PERSONAL_FIELDS)[number]

/**
 * Mirrors firestore.rules' canEditPerson() for UI purposes (showing/hiding
 * the Edit button). Not itself a security boundary — the deployed rules
 * are what actually enforce this; this just keeps the UI honest about
 * what will succeed.
 */
export function canEditPerson(user: AuthUser | null, target: Person): boolean {
  if (!user || !user.naharId) return false
  if (user.role === 'admin') return true
  if (user.naharId === target.nahar_id) return true

  return (
    target.spouse.includes(user.naharId) ||
    target.parents.includes(user.naharId) || // target is my child
    target.children.includes(user.naharId) || // target is my parent
    target.linkedFamilyOf === user.naharId // target is a linked family I connect through
  )
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

export type RelationKind = 'parent' | 'spouse' | 'child'

/**
 * Mirrors firestore.rules' create-permission boundary: true if `user` may
 * add a new `relation` anchored on `anchor`. Same UI-mirror caveat as
 * canEditPerson — the deployed rules are the real enforcement.
 */
export function canAddRelationship(user: AuthUser | null, anchor: Person, relation: RelationKind): boolean {
  void relation // every relation kind shares the same anchor boundary today
  return canEditPerson(user, anchor)
}

/** True if `user` may create a linked-external-family root anchored on `anchor`. */
export function canAddLinkedFamily(user: AuthUser | null, anchor: Person): boolean {
  return canEditPerson(user, anchor)
}

/**
 * Client-only convenience (the client already holds the full people[]
 * array in memory, so this can correctly express "any descendant of me"
 * for UI-gating purposes, unlike the rules layer which only strictly
 * re-validates one hop at a time per addition).
 */
export function isDescendantOf(user: AuthUser | null, target: Person, people: Person[]): boolean {
  if (!user?.naharId) return false
  const byId = new Map(people.map((p) => [p.nahar_id, p]))
  const visited = new Set<string>()
  let frontier = [target.nahar_id]
  while (frontier.length > 0) {
    const id = frontier.shift()!
    if (id === user.naharId) return true
    if (visited.has(id)) continue
    visited.add(id)
    const person = byId.get(id)
    if (person) frontier = frontier.concat(person.parents)
  }
  return false
}
