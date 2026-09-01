import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isPlaceholder, type Person } from '../../data/schema'
import { maskName } from '../../lib/nameMask'
import { PersonAvatar } from '../person/PersonAvatar'

interface TreePreviewProps {
  people: Person[]
}

interface PreviewCard {
  person: Person
  role: 'self' | 'parent' | 'child'
}

const MAX_CHILDREN_SHOWN = 4

/** Centers the preview on the signed-in member: their parents above, them in the middle (glowing), a few of their children below. Falls back to a plain roster for signed-out visitors, since there's no "self" to center on. */
function buildCards(people: Person[], selfId: string | null): PreviewCard[] {
  if (!selfId) return []
  const byId = new Map(people.map((p) => [p.nahar_id, p]))
  const self = byId.get(selfId)
  if (!self) return []

  const parents = self.parents.map((id) => byId.get(id)).filter((p): p is Person => !!p && !isPlaceholder(p))
  const children = self.children
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p && !isPlaceholder(p))
    .slice(0, MAX_CHILDREN_SHOWN)

  return [
    ...parents.map((person): PreviewCard => ({ person, role: 'parent' })),
    { person: self, role: 'self' },
    ...children.map((person): PreviewCard => ({ person, role: 'child' })),
  ]
}

export function TreePreview({ people }: TreePreviewProps) {
  const { user } = useAuth()
  const isLinkedMember = !!user?.naharId
  const cards = buildCards(people, user?.naharId ?? null)
  const fallback = people.filter((p) => !isPlaceholder(p)).slice(0, 6)
  const showingSelf = cards.length > 0

  const items: PreviewCard[] = showingSelf ? cards : fallback.map((person) => ({ person, role: 'child' }))

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="glass-strong rounded-3xl p-8 sm:p-12"
      >
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-card-foreground)] sm:text-3xl">
            A Growing Family
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            {showingSelf
              ? 'Your place in the tree — parents, you, and your children.'
              : 'This is just the beginning — more branches of the Nahar tree are being added.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {items.map(({ person, role }, i) => (
            <motion.div
              key={person.nahar_id}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
              className="flex flex-col items-center gap-2"
            >
              <div className={role === 'self' ? 'relative' : undefined}>
                {role === 'self' && (
                  <div
                    aria-hidden="true"
                    className="focus-ring-pulse absolute inset-0 -m-1 rounded-full"
                    style={{ boxShadow: 'var(--shadow-glow)' }}
                  />
                )}
                <PersonAvatar person={person} size={role === 'self' ? 'lg' : 'md'} masked={!isLinkedMember} />
              </div>
              <p
                className={`text-xs font-medium text-[var(--color-card-foreground)] ${role === 'self' ? 'font-semibold' : ''}`}
              >
                {isLinkedMember ? person.name : maskName(person.name)}
                {role === 'self' && ' (You)'}
              </p>
              {role !== 'self' && (
                <p className="text-[10px] tracking-wide text-[var(--color-muted-foreground)] uppercase">
                  {role === 'parent' ? 'Parent' : 'Child'}
                </p>
              )}
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            to="/tree"
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            Explore the full tree
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
