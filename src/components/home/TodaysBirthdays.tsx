import { motion } from 'framer-motion'
import { Cake, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Person } from '../../data/schema'
import { ageInYears, isBirthdayToday } from '../../lib/dateOfBirth'
import { maskName } from '../../lib/nameMask'
import { PersonAvatar } from '../person/PersonAvatar'

interface TodaysBirthdaysProps {
  people: Person[]
}

export function TodaysBirthdays({ people }: TodaysBirthdaysProps) {
  const { user } = useAuth()
  const isLinkedMember = !!user?.naharId
  const today = new Date()
  const celebrants = people.filter((p) => p.status === 'living' && isBirthdayToday(p, today))

  if (celebrants.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="glass-strong flex flex-col items-center gap-2 rounded-3xl p-8 text-center sm:p-12"
        >
          <Cake size={26} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
          <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-card-foreground)] sm:text-2xl">
            No Birthdays Today
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            Check back another day to celebrate with the family.
          </p>
        </motion.div>
      </section>
    )
  }

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
          <h2 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-card-foreground)] sm:text-3xl">
            <PartyPopper size={26} className="text-[var(--color-accent)]" aria-hidden="true" />
            Today&rsquo;s Birthday{celebrants.length > 1 ? 's' : ''}
            <span aria-hidden="true">🎉</span>
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            Join us in wishing a very happy birthday!
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {celebrants.map((person, i) => {
            const age = ageInYears(person, today)
            return (
              <motion.div
                key={person.nahar_id}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }}
              >
                <Link
                  to={`/person/${person.nahar_id}`}
                  className="flex flex-col items-center gap-2 rounded-2xl p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <div className="relative">
                    <div className="absolute inset-0 -m-1.5 animate-pulse rounded-full bg-[var(--color-accent)]/20 blur-md" />
                    <PersonAvatar person={person} size="md" masked={!isLinkedMember} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-card-foreground)]">
                    {isLinkedMember ? person.name : maskName(person.name)}
                  </p>
                  {isLinkedMember && age != null && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">Turning {age} today</p>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
