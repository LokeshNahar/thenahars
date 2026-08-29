import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'

interface TreePreviewProps {
  people: Person[]
}

export function TreePreview({ people }: TreePreviewProps) {
  const featured = people.filter((p) => !isPlaceholder(p)).slice(0, 6)

  if (featured.length === 0) return null

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 sm:p-12"
      >
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-card-foreground)] sm:text-3xl">
            A Growing Family
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            This is just the beginning — more branches of the Nahar tree are being added.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {featured.map((person, i) => (
            <motion.div
              key={person.nahar_id}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
              className="flex flex-col items-center gap-2"
            >
              <PersonAvatar person={person} size="md" />
              <p className="text-xs font-medium text-[var(--color-card-foreground)]">{person.name}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            to="/tree"
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            View the full tree
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
