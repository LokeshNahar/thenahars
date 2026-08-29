import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MiniMap,
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
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
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    // Frame the toggled branch after its layout settles, so a newly
    // expanded (or re-collapsed) subtree stays in view instead of the
    // camera staying put while nodes reflow off-screen.
    window.setTimeout(() => {
      const el = contentRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
      if (el && transformRef.current) {
        transformRef.current.zoomToElement(el, undefined, 500, 'easeOut')
      }
    }, 60)
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
    <div className="glass relative h-[75vh] w-full overflow-hidden rounded-3xl">
      <div className="mesh-glow" aria-hidden="true" />
      <TransformWrapper
        ref={transformRef}
        minScale={0.25}
        maxScale={2.5}
        initialScale={0.8}
        centerOnInit
        wheel={{ step: 0.15 }}
      >
        <TreeControls />
        <MiniMap
          width={140}
          borderColor="var(--glass-border)"
          wrapperClassName="!bg-[var(--glass-bg-strong)] !border-[var(--glass-border)] !rounded-xl !overflow-hidden !shadow-[var(--shadow-elevated)]"
          previewClassName="!border-[var(--color-accent)]"
        >
          <TreeStatic positioned={positioned} byIdMap={byIdMap} width={width} height={height} offsetX={offsetX} />
        </MiniMap>
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <div ref={contentRef} className="relative" style={{ width, height }}>
            <svg className="absolute top-0 left-0" width={width} height={height} aria-hidden="true">
              <defs>
                <linearGradient id="tree-edge-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="var(--color-border)" stopOpacity="0.7" />
                </linearGradient>
              </defs>
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

/** Simplified static rendering used inside the MiniMap (no interaction, no popovers). */
function TreeStatic({
  positioned,
  byIdMap,
  width,
  height,
  offsetX,
}: {
  positioned: ReturnType<typeof layoutTree>
  byIdMap: Map<string, ReturnType<typeof layoutTree>[number]>
  width: number
  height: number
  offsetX: number
}) {
  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute top-0 left-0" width={width} height={height}>
        {positioned
          .filter((p) => p.parentId)
          .map((p) => {
            const parent = byIdMap.get(p.parentId!)
            if (!parent) return null
            const fromX = parent.x + offsetX
            const fromY = parent.y + 24
            const toX = p.x + offsetX
            const toY = p.y - 24
            const midY = (fromY + toY) / 2
            return (
              <path
                key={p.unit.id}
                d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={4}
              />
            )
          })}
      </svg>
      {positioned.map((p) => (
        <div
          key={p.unit.id}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
          style={{ left: p.x + offsetX, top: p.y }}
        />
      ))}
    </div>
  )
}
