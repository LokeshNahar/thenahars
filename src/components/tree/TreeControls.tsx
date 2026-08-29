import { motion } from 'framer-motion'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { useControls } from 'react-zoom-pan-pinch'

export function TreeControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  const buttonClass =
    'glass flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]'

  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => zoomIn()}
        aria-label="Zoom in"
        className={buttonClass}
      >
        <ZoomIn size={18} aria-hidden="true" />
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => zoomOut()}
        aria-label="Zoom out"
        className={buttonClass}
      >
        <ZoomOut size={18} aria-hidden="true" />
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => resetTransform()}
        aria-label="Reset view"
        className={buttonClass}
      >
        <Maximize size={16} aria-hidden="true" />
      </motion.button>
    </div>
  )
}
