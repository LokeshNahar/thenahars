import type { Person } from '../data/schema'

/**
 * A FamilyUnit groups a person with their spouse(s) so the tree can render
 * couples side-by-side with children branching from the pair, per standard
 * genealogy-chart convention. `childUnits` are the family units formed by
 * this unit's children (each child + their own spouse), populated lazily by
 * the caller only for currently-expanded nodes.
 */
export interface FamilyUnit {
  id: string
  primary: Person
  spouses: Person[]
  children: Person[]
  childUnits: FamilyUnit[]
}

function byId(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.nahar_id, p]))
}

/**
 * Builds a single FamilyUnit for `person`, optionally expanding into child
 * units. `expandedIds` controls which units are allowed to reveal their own
 * children — this is what makes tree rendering lazy: only currently
 * expanded branches get laid out.
 *
 * `readOnlyIds` marks person ids that must render as a bare leaf even
 * though the underlying data gives them a spouse/children — used by the
 * linked-family takeover view for the anchor who connects the branch to
 * the main tree (e.g. Vanita shown among her siblings): their own
 * spouse/children belong to the MAIN tree, and pulling those in here would
 * defeat the whole point of the branch staying folded away until opened.
 */
export function buildFamilyUnit(
  personId: string,
  people: Person[],
  expandedIds: Set<string>,
  visited: Set<string> = new Set(),
  readOnlyIds: Set<string> = new Set(),
): FamilyUnit | null {
  const index = byId(people)
  const primary = index.get(personId)
  if (!primary || visited.has(personId)) return null

  visited.add(personId)
  const isReadOnly = readOnlyIds.has(personId)
  const spouses = isReadOnly ? [] : primary.spouse.map((id) => index.get(id)).filter((p): p is Person => !!p)
  for (const s of spouses) visited.add(s.nahar_id)

  const children = isReadOnly
    ? []
    : primary.children.map((id) => index.get(id)).filter((p): p is Person => !!p)

  const childUnits: FamilyUnit[] = []
  if (!isReadOnly && expandedIds.has(personId)) {
    for (const child of children) {
      if (visited.has(child.nahar_id)) continue
      const unit = buildFamilyUnit(child.nahar_id, people, expandedIds, visited, readOnlyIds)
      if (unit) childUnits.push(unit)
    }
  }

  return {
    id: personId,
    primary,
    spouses,
    children,
    childUnits,
  }
}

/**
 * Finds the main tree's root couple: the earliest-generation person(s)
 * with no parents recorded. Explicitly excludes linked-external-family
 * roots (`linkedFamilyOf` set) — those have empty `parents` too, but must
 * never be picked as if they were part of the main Nahar lineage.
 */
export function findRootId(people: Person[]): string | null {
  const roots = people.filter((p) => p.parents.length === 0 && !p.linkedFamilyOf)
  if (roots.length === 0) return null
  const earliest = roots.reduce((min, p) => (p.generation < min.generation ? p : min), roots[0])
  return earliest.nahar_id
}

/**
 * Returns every ancestor id (root-first) that must be expanded for
 * `personId` to be reachable by the lazy-expand tree — i.e. every person
 * on the path from the root down to (but not including) the target
 * themself, since expansion state tracks "whose children are visible."
 * A married-in spouse's own parents array is empty, so this naturally
 * stops there without special-casing.
 */
export function getAncestorChain(personId: string, people: Person[]): string[] {
  const index = byId(people)
  const chain: string[] = []
  const visited = new Set<string>()

  let current = index.get(personId)
  while (current && current.parents.length > 0) {
    const parentId = current.parents[0]
    if (visited.has(parentId)) break // guard against malformed cyclic data
    visited.add(parentId)
    chain.unshift(parentId)
    current = index.get(parentId)
  }

  return chain
}
