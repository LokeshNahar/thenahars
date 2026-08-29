import { isPlaceholder, type Person } from '../data/schema'

export interface SearchResult {
  person: Person
  score: number
}

/**
 * Simple in-memory substring search across name/profession/location.
 * Fine at this scale (dozens–low thousands of records); revisit with a
 * proper index (e.g. Fuse.js) only if the family tree grows well beyond that.
 */
export function searchPeople(people: Person[], query: string): SearchResult[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  const results: SearchResult[] = []

  for (const person of people) {
    if (isPlaceholder(person)) continue

    const nameMatch = person.name.toLowerCase().includes(trimmed)
    const professionMatch = person.profession?.toLowerCase().includes(trimmed) ?? false
    const locationMatch = person.location?.toLowerCase().includes(trimmed) ?? false

    if (!nameMatch && !professionMatch && !locationMatch) continue

    let score = 0
    if (nameMatch) score += 3
    if (professionMatch) score += 2
    if (locationMatch) score += 1

    results.push({ person, score })
  }

  return results.sort((a, b) => b.score - a.score)
}
