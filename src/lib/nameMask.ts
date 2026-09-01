/**
 * Masks a name to its first two characters + a fixed-length mask, e.g.
 * "Vanita Nahar" -> "Va****". Used for logged-out/unmatched visitors, who
 * per the family's privacy preference may browse the tree's shape but not
 * read full identities until they sign in as a recognized member.
 */
export function maskName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed.padEnd(trimmed.length + 4, '*')
  return `${trimmed.slice(0, 2)}****`
}
