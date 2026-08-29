import { motion } from 'framer-motion'
import { ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 text-sm font-medium tracking-widest text-[var(--color-accent)] uppercase"
      >
        Est. with Bhanwar Lal &amp; Bhanwari Devi Nahar
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="font-[var(--font-heading)] text-4xl font-bold text-balance text-[var(--color-foreground)] sm:text-6xl"
      >
        The Nahars
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-5 max-w-xl text-lg text-[var(--color-muted-foreground)]"
      >
        A living record of our family — every branch, every generation — kept together in one place.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <Link
          to="/tree"
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition-opacity hover:opacity-90"
        >
          Explore the Tree
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link
          to="/directory"
          className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
        >
          <Search size={16} aria-hidden="true" />
          Search Directory
        </Link>
      </motion.div>
    </section>
  )
}
