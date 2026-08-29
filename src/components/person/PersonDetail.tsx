import { motion } from 'framer-motion'
import { Briefcase, Mail, MapPin, Phone } from 'lucide-react'
import type { Person } from '../../data/schema'
import { PersonAvatar } from './PersonAvatar'
import { PersonCard } from './PersonCard'
import { StatusBadge } from './StatusBadge'

interface PersonDetailProps {
  person: Person
  parents: Person[]
  spouses: Person[]
  offspring: Person[]
}

const FIELD_ROWS: Array<{ key: keyof Person; icon: typeof Phone; label: string }> = [
  { key: 'phone', icon: Phone, label: 'Phone' },
  { key: 'email', icon: Mail, label: 'Email' },
  { key: 'profession', icon: Briefcase, label: 'Profession' },
  { key: 'location', icon: MapPin, label: 'Location' },
]

function RelationSection({ title, people }: { title: string; people: Person[] }) {
  if (people.length === 0) return null
  return (
    <div>
      <h3 className="mb-3 font-[var(--font-heading)] text-lg font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {people.map((p) => (
          <PersonCard key={p.nahar_id} person={p} />
        ))}
      </div>
    </div>
  )
}

export function PersonDetail({ person, parents, spouses, offspring }: PersonDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-10"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <PersonAvatar person={person} size="lg" />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--color-foreground)]">
            {person.name}
          </h1>
          <StatusBadge status={person.status} />
          <dl className="mt-2 flex flex-col gap-1.5">
            {FIELD_ROWS.map(({ key, icon: Icon, label }) => {
              const value = person[key]
              if (!value || typeof value !== 'string') return null
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"
                >
                  <Icon size={14} aria-hidden="true" />
                  <dt className="sr-only">{label}</dt>
                  <dd>{value}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>

      <RelationSection title="Parents" people={parents} />
      <RelationSection title={spouses.length > 1 ? 'Spouses' : 'Spouse'} people={spouses} />
      <RelationSection title="Children" people={offspring} />
    </motion.div>
  )
}
