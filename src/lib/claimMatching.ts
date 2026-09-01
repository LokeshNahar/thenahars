import { isPlaceholder, type Person } from '../data/schema'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function looseIncludes(haystack: string, needle: string): boolean {
  const a = normalize(haystack)
  const b = normalize(needle)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

/**
 * Finds every Person whose own name loosely matches `submittedName`, AND
 * who has at least one recorded parent whose name loosely matches
 * `fatherName`, AND at least one recorded parent (the other slot or the
 * same one) whose name loosely matches `motherName`. Parents aren't stored
 * gender-ordered, so both provided names are checked against both parent
 * slots rather than assuming array position.
 *
 * Deliberately loose (substring, case-insensitive, either-direction) — this
 * only produces candidates for an admin to confirm in AdminPage, never an
 * auto-approval, so false positives cost a moment of admin review rather
 * than a security hole.
 */
export function findClaimCandidates(
  people: Person[],
  submittedName: string,
  fatherName: string,
  motherName: string,
): Person[] {
  const byId = new Map(people.map((p) => [p.nahar_id, p]))

  return people.filter((person) => {
    if (isPlaceholder(person)) return false
    if (!looseIncludes(person.name, submittedName)) return false

    const parentNames = person.parents.map((id) => byId.get(id)?.name).filter((n): n is string => !!n)
    if (parentNames.length === 0) return false

    const fatherMatches = parentNames.some((n) => looseIncludes(n, fatherName))
    const motherMatches = parentNames.some((n) => looseIncludes(n, motherName))
    return fatherMatches && motherMatches
  })
}
