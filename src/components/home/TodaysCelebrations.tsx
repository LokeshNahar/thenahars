import { motion } from 'framer-motion'
import { Cake, Heart, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Person } from '../../data/schema'
import { ageInYears, isAnniversaryToday, isBirthdayToday, yearsMarried } from '../../lib/dateOfBirth'
import { maskName } from '../../lib/nameMask'
import { PersonAvatar } from '../person/PersonAvatar'

interface TodaysCelebrationsProps {
  people: Person[]
}

interface AnniversaryCouple {
  key: string
  primary: Person
  spouse: Person
  years: number | null
}

/** Pairs each living person married-today with their first living spouse, deduped so a couple appears once (not once per spouse). */
function findAnniversaryCouples(people: Person[], today: Date): AnniversaryCouple[] {
  const byId = new Map(people.map((p) => [p.nahar_id, p]))
  const seen = new Set<string>()
  const couples: AnniversaryCouple[] = []

  for (const person of people) {
    if (person.status !== 'living' || !isAnniversaryToday(person, today)) continue
    const spouseId = person.spouse.find((id) => byId.get(id)?.status === 'living')
    const spouse = spouseId ? byId.get(spouseId) : undefined
    if (!spouse) continue

    const key = [person.nahar_id, spouse.nahar_id].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    couples.push({ key, primary: person, spouse, years: yearsMarried(person, today) })
  }

  return couples
}

export function TodaysCelebrations({ people }: TodaysCelebrationsProps) {
  const { user } = useAuth()
  const isLinkedMember = !!user?.naharId
  const today = new Date()
  const birthdayPeople = people.filter((p) => p.status === 'living' && isBirthdayToday(p, today))
  const anniversaryCouples = findAnniversaryCouples(people, today)

  const hasNothing = birthdayPeople.length === 0 && anniversaryCouples.length === 0

  if (hasNothing) {
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
            No Celebrations Today
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
            Today&rsquo;s Celebrations
            <span aria-hidden="true">🎉</span>
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            Join us in wishing the family well!
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {birthdayPeople.map((person, i) => {
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

          {anniversaryCouples.map(({ key, primary, spouse, years }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (birthdayPeople.length + i) * 0.08, ease: 'easeOut' }}
              className="flex flex-col items-center gap-2 rounded-2xl p-2"
            >
              <div className="flex items-center">
                <Link
                  to={`/person/${primary.nahar_id}`}
                  className="relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <div className="absolute inset-0 -m-1.5 animate-pulse rounded-full bg-[var(--color-destructive)]/15 blur-md" />
                  <PersonAvatar person={primary} size="md" masked={!isLinkedMember} />
                </Link>
                <Heart
                  size={16}
                  className="-mx-1.5 shrink-0 fill-[var(--color-destructive)] text-[var(--color-destructive)]"
                  aria-hidden="true"
                />
                <Link
                  to={`/person/${spouse.nahar_id}`}
                  className="relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <div className="absolute inset-0 -m-1.5 animate-pulse rounded-full bg-[var(--color-destructive)]/15 blur-md" />
                  <PersonAvatar person={spouse} size="md" masked={!isLinkedMember} />
                </Link>
              </div>
              <p className="max-w-[10rem] text-center text-sm font-semibold text-[var(--color-card-foreground)]">
                {isLinkedMember
                  ? `${primary.name.split(' ')[0]} & ${spouse.name.split(' ')[0]}`
                  : `${maskName(primary.name)} & ${maskName(spouse.name)}`}
              </p>
              {isLinkedMember && years != null && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {years} {years === 1 ? 'year' : 'years'} today
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
