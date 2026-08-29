import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { Person } from '../../data/schema'
import { buildFamilyUnit, findRootId } from '../../lib/treeBuilder'
import { layoutTree } from '../../lib/treeLayout'
import { TreeControls } from './TreeControls'
import { TreeEdge } from './TreeEdge'
import { TreeNode } from './TreeNode'

interface FamilyTreeCanvasProps {
  people: Person[]
}

export function FamilyTreeCanvas({ people }: FamilyTreeCanvasProps) {
  const rootId = useMemo(() => findRootId(people), [people])
  const [expanded, setExpanded] = useState<Set<string>>(() => (rootId ? new Set([rootId]) : new Set()))

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const root = useMemo(
    () => (rootId ? buildFamilyUnit(rootId, people, expanded) : null),
    [rootId, people, expanded],
  )
  const positioned = useMemo(() => (root ? layoutTree(root) : []), [root])

  if (!root) {
    return (
      <p className="py-16 text-center text-[var(--color-muted-foreground)]">
        No family tree data available yet.
      </p>
    )
  }

  const byIdMap = new Map(positioned.map((p) => [p.unit.id, p]))
  const minX = Math.min(...positioned.map((p) => p.x))
  const maxX = Math.max(...positioned.map((p) => p.x))
  const width = Math.max(maxX - minX + 400, 800)
  const height = Math.max(...positioned.map((p) => p.y)) + 300
  const offsetX = width / 2 - (minX + maxX) / 2

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <TransformWrapper minScale={0.3} maxScale={2} initialScale={0.8} centerOnInit>
        <TreeControls />
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <div className="relative" style={{ width, height }}>
            <svg className="absolute top-0 left-0" width={width} height={height} aria-hidden="true">
              <AnimatePresence>
                {positioned
                  .filter((p) => p.parentId)
                  .map((p) => {
                    const parent = byIdMap.get(p.parentId!)
                    if (!parent) return null
                    return (
                      <TreeEdge
                        key={p.unit.id}
                        fromX={parent.x + offsetX}
                        fromY={parent.y + 24}
                        toX={p.x + offsetX}
                        toY={p.y - 24}
                      />
                    )
                  })}
              </AnimatePresence>
            </svg>
            <AnimatePresence>
              {positioned.map((p) => (
                <TreeNode
                  key={p.unit.id}
                  primary={p.unit.primary}
                  spouses={p.unit.spouses}
                  hasChildren={p.unit.children.length > 0}
                  expanded={expanded.has(p.unit.id)}
                  onToggle={() => toggle(p.unit.id)}
                  x={p.x + offsetX}
                  y={p.y}
                />
              ))}
            </AnimatePresence>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
