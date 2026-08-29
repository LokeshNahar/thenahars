import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { useControls } from 'react-zoom-pan-pinch'

export function TreeControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  const buttonClass =
    'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]'

  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
      <button type="button" onClick={() => zoomIn()} aria-label="Zoom in" className={buttonClass}>
        <ZoomIn size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => zoomOut()} aria-label="Zoom out" className={buttonClass}>
        <ZoomOut size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => resetTransform()} aria-label="Reset view" className={buttonClass}>
        <Maximize size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
