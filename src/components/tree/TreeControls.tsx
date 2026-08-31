import { motion } from 'framer-motion'
import { Maximize, MapPin, ZoomIn, ZoomOut } from 'lucide-react'
import { useControls } from 'react-zoom-pan-pinch'

interface TreeControlsProps {
  /** Present only when there's a signed-in, matched viewer to jump to. */
  onGoToMyBranch?: () => void
}

interface ControlButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
  accent?: boolean
}

function ControlButton({ label, onClick, children, accent = false }: ControlButtonProps) {
  return (
    <div className="group relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        aria-label={label}
        className={`glass flex h-11 w-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] ${
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-foreground)]'
        }`}
      >
        {children}
      </motion.button>
      <span
        role="tooltip"
        className="glass-strong pointer-events-none absolute top-1/2 right-full mr-2.5 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--color-foreground)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  )
}

export function TreeControls({ onGoToMyBranch }: TreeControlsProps) {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
      {onGoToMyBranch && (
        <ControlButton label="Go to My Branch" onClick={onGoToMyBranch} accent>
          <MapPin size={18} aria-hidden="true" />
        </ControlButton>
      )}
      <ControlButton label="Zoom in" onClick={() => zoomIn()}>
        <ZoomIn size={18} aria-hidden="true" />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={() => zoomOut()}>
        <ZoomOut size={18} aria-hidden="true" />
      </ControlButton>
      <ControlButton label="Fit to screen" onClick={() => resetTransform()}>
        <Maximize size={16} aria-hidden="true" />
      </ControlButton>
    </div>
  )
}
