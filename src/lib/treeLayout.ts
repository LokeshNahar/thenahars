import { hierarchy, tree } from 'd3-hierarchy'
import type { FamilyUnit } from './treeBuilder'

export interface PositionedUnit {
  unit: FamilyUnit
  x: number
  y: number
  parentId: string | null
}

// A couple (primary + one spouse) renders ~252px wide and up to ~142px tall
// (status badge on a "late" record adds height); these reserve enough
// per-node slot space that adjacent cards keep a clear gap instead of
// touching or overlapping — see TreeNode's MiniCard/couple-row markup.
const NODE_WIDTH = 320
const NODE_HEIGHT = 280

/**
 * Lays out the currently-expanded FamilyUnit tree using d3's tree algorithm.
 * Only units present in the passed-in tree get a position — collapsed
 * branches simply aren't part of the FamilyUnit.childUnits structure, so
 * they're never laid out or rendered (the lazy-render strategy).
 */
export function layoutTree(root: FamilyUnit): PositionedUnit[] {
  const root_ = hierarchy<FamilyUnit>(root, (u) => u.childUnits)
  const layout = tree<FamilyUnit>().nodeSize([NODE_WIDTH, NODE_HEIGHT])
  const laidOut = layout(root_)

  const positioned: PositionedUnit[] = []
  laidOut.each((node) => {
    positioned.push({
      unit: node.data,
      x: node.x ?? 0,
      y: node.y ?? 0,
      parentId: node.parent ? node.parent.data.id : null,
    })
  })
  return positioned
}
