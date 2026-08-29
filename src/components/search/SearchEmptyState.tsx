import { motion } from 'framer-motion'
import { SearchX } from 'lucide-react'
import { MagneticButton } from '../ui/MagneticButton'

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-3 py-16 text-center"
    >
      <SearchX size={32} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
      <p className="text-[var(--color-foreground)]">
        No results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
      </p>
      <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
        Try a different spelling, or search by profession or location instead of a full name.
      </p>
      <div className="mt-2 flex gap-3">
        <MagneticButton to="/tree" variant="glass" className="px-4 py-2 text-sm">
          Browse the family tree
        </MagneticButton>
        <MagneticButton to="/about" variant="solid" className="px-4 py-2 text-sm">
          Know someone missing?
        </MagneticButton>
      </div>
    </motion.div>
  )
}
