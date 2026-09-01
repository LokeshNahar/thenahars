import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MiniMap,
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
import type { Person } from '../../data/schema'
import { buildFamilyUnit, findRootId, getAncestorChain } from '../../lib/treeBuilder'
import { layoutTree } from '../../lib/treeLayout'
import { LinkedFamilyView } from './LinkedFamilyView'
import { TreeControls } from './TreeControls'
import { TreeEdge } from './TreeEdge'
import { TreeNode } from './TreeNode'

interface FamilyTreeCanvasProps {
  people: Person[]
  /** When set, the tree auto-expands the path to this person and frames them. */
  focusId?: string | null
  /**
   * Renders the tree rooted at this person instead of the main Nahar
   * root — used by the linked-family full-screen takeover view. When
   * unset, falls back to the normal findRootId() behavior.
   */
  rootIdOverride?: string
}

function framePerson(
  id: string,
  contentRef: React.RefObject<HTMLDivElement | null>,
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>,
  delayMs = 60,
) {
  window.setTimeout(() => {
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
    if (el && transformRef.current) {
      transformRef.current.zoomToElement(el, undefined, 500, 'easeOut')
    }
  }, delayMs)
}

export function FamilyTreeCanvas({ people, focusId, rootIdOverride }: FamilyTreeCanvasProps) {
  const rootId = useMemo(() => rootIdOverride ?? findRootId(people), [people, rootIdOverride])
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (rootId) initial.add(rootId)
    if (focusId) for (const id of getAncestorChain(focusId, people)) initial.add(id)
    return initial
  })
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [pinchReady, setPinchReady] = useState(false)
  const [openLinkedFamilyId, setOpenLinkedFamilyId] = useState<string | null>(null)

  // Only meaningful when this canvas is itself rendering the main tree — a
  // linked-family branch's own root has no further linked branches, so the
  // takeover never nests inside itself.
  const linkedFamilyByPersonId = useMemo(() => {
    const map = new Map<string, string>()
    if (rootIdOverride) return map
    for (const p of people) {
      if (p.linkedFamilyOf) {
        map.set(p.linkedFamilyOf, p.linkedFamilyLabel ?? `${p.name.split(' ')[0]}'s Family`)
      }
    }
    return map
  }, [people, rootIdOverride])

  const linkedFamilyRoot = openLinkedFamilyId
    ? people.find((p) => p.linkedFamilyOf === openLinkedFamilyId)
    : null
  const linkedFamilyAnchor = openLinkedFamilyId ? people.find((p) => p.nahar_id === openLinkedFamilyId) : null

  // When THIS canvas itself is rendering a linked-family branch (i.e. it
  // was mounted with rootIdOverride pointing at a linkedFamilyOf root),
  // the anchor who connects that branch to the main tree may appear
  // inside it as one of their parents' children (e.g. Vanita, shown among
  // her siblings). That anchor's own children/spouse belong to the MAIN
  // tree, not this branch — expanding them here would pull the whole main
  // Nahar tree into this "folded away" view, exactly what the fold/reveal
  // design exists to prevent. So the anchor renders read-only here.
  const readOnlyIds = useMemo(() => {
    const anchorId = rootIdOverride ? people.find((p) => p.nahar_id === rootIdOverride)?.linkedFamilyOf : null
    return anchorId ? new Set([anchorId]) : new Set<string>()
  }, [people, rootIdOverride])

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
    framePerson(id, contentRef, transformRef)
  }, [])

  // Re-expands the path to focusId (in case the viewer collapsed it since)
  // and re-frames them — the "Go to My Branch" control's handler.
  const goToMyBranch = useCallback(() => {
    if (!focusId) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const id of getAncestorChain(focusId, people)) next.add(id)
      return next
    })
    setFocusedNodeId(focusId)
    framePerson(focusId, contentRef, transformRef, 120)
  }, [focusId, people])

  // On first mount with a focus target, frame that person — but only once
  // react-zoom-pan-pinch itself has finished its own initial centerOnInit
  // setup (via onInit below). Framing before that races the wrapper's own
  // positioning and the ancestor chain's Framer Motion spring-in, both of
  // which are still animating on the very first render — that race is what
  // previously left the camera stopped on an intermediate ancestor instead
  // of the actual focused person. A longer settle delay here (vs. the
  // ~60ms used for a user-triggered toggle, which only ever animates one
  // already-mounted level) gives multi-level chains time to finish.
  useEffect(() => {
    if (!focusId || !pinchReady) return
    setFocusedNodeId(focusId)
    framePerson(focusId, contentRef, transformRef, 350)
    // Only ever run this once pinchReady flips true for this focus target —
    // re-focusing on every people/expanded change would fight the user's
    // own subsequent panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, pinchReady])

  const root = useMemo(
    () => (rootId ? buildFamilyUnit(rootId, people, expanded, undefined, readOnlyIds) : null),
    [rootId, people, expanded, readOnlyIds],
  )
  const positioned = useMemo(() => (root ? layoutTree(root) : []), [root])

  // Every unit id on the path from root down to (and including) the
  // focused person — used to render "my branch" thicker/warmer than the
  // rest of the tree. Only meaningful once we actually have a focus target.
  const myPathIds = useMemo(() => {
    if (!focusId) return null
    return new Set([...getAncestorChain(focusId, people), focusId])
  }, [focusId, people])

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 45%, var(--color-background) 115%)',
          opacity: 0.6,
        }}
      />
      <TransformWrapper
        ref={transformRef}
        minScale={0.25}
        maxScale={2.5}
        initialScale={0.8}
        centerOnInit
        wheel={{ step: 0.15 }}
        onInit={() => setPinchReady(true)}
      >
        <TreeControls onGoToMyBranch={focusId ? goToMyBranch : undefined} />
        <MiniMap
          width={140}
          height={100}
          borderColor="var(--color-accent)"
          wrapperClassName="!overflow-hidden !rounded-xl !border !border-[var(--glass-border)] !bg-[var(--glass-bg-strong)] !shadow-[var(--shadow-elevated)]"
          previewStyle={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderRadius: 4,
            boxShadow: 'none',
          }}
        >
          <TreeStatic
            positioned={positioned}
            byIdMap={byIdMap}
            width={width}
            height={height}
            offsetX={offsetX}
          />
        </MiniMap>
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} infinite>
          <div ref={contentRef} className="relative" style={{ width, height }}>
            <svg className="absolute top-0 left-0" width={width} height={height} aria-hidden="true">
              <defs>
                <linearGradient id="tree-edge-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--color-border)" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <AnimatePresence>
                {positioned
                  .filter((p) => p.parentId)
                  .map((p, i) => {
                    const parent = byIdMap.get(p.parentId!)
                    if (!parent) return null
                    const onMyPath = !!myPathIds && myPathIds.has(p.unit.id) && myPathIds.has(parent.unit.id)
                    return (
                      <TreeEdge
                        key={p.unit.id}
                        fromX={parent.x + offsetX}
                        fromY={parent.y + 24}
                        toX={p.x + offsetX}
                        toY={p.y - 24}
                        delay={Math.min(i, 7) * 0.05}
                        onMyPath={onMyPath}
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
                  focused={p.unit.id === focusedNodeId}
                  linkedFamilyByPersonId={linkedFamilyByPersonId}
                  onOpenLinkedFamily={linkedFamilyByPersonId.size > 0 ? setOpenLinkedFamilyId : undefined}
                  mainTreeAnchorId={readOnlyIds.size > 0 ? [...readOnlyIds][0] : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        </TransformComponent>
      </TransformWrapper>

      {linkedFamilyRoot && linkedFamilyAnchor && (
        <LinkedFamilyView
          root={linkedFamilyRoot}
          anchor={linkedFamilyAnchor}
          people={people}
          onClose={() => setOpenLinkedFamilyId(null)}
        />
      )}
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
