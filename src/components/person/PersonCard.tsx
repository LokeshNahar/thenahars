import { Briefcase, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isPlaceholder, type Person } from '../../data/schema'
import { TiltCard } from '../ui/TiltCard'
import { PersonAvatar } from './PersonAvatar'
import { StatusBadge } from './StatusBadge'

interface PersonCardProps {
  person: Person
  highlight?: string
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-[var(--color-accent)]/25 text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function PersonCard({ person, highlight }: PersonCardProps) {
  const { user } = useAuth()
  const isLinkedMember = !!user?.naharId
  const placeholder = isPlaceholder(person)

  const inner = (
    <div
      className={`flex h-full flex-col items-center gap-3 rounded-2xl p-5 text-center transition-shadow duration-200 ${
        placeholder
          ? 'border border-dashed border-[var(--color-border)] bg-transparent'
          : 'glass hover:shadow-[var(--shadow-elevated)]'
      }`}
    >
      <PersonAvatar person={person} size="md" />
      <div className="flex flex-col items-center gap-1">
        <p
          className={`font-[var(--font-heading)] text-base font-semibold ${
            placeholder
              ? 'text-[var(--color-muted-foreground)] italic'
              : 'text-[var(--color-card-foreground)]'
          }`}
        >
          <HighlightedText text={person.name} query={highlight} />
        </p>
        {isLinkedMember && person.profession && (
          <p className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <Briefcase size={12} aria-hidden="true" />
            <HighlightedText text={person.profession} query={highlight} />
          </p>
        )}
        {isLinkedMember && person.location && (
          <p className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <MapPin size={12} aria-hidden="true" />
            <HighlightedText text={person.location} query={highlight} />
          </p>
        )}
      </div>
      <StatusBadge status={person.status} />
    </div>
  )

  if (placeholder) return <div className="h-full">{inner}</div>

  const content = (
    <TiltCard className="h-full" maxTilt={6} accentGlow>
      {inner}
    </TiltCard>
  )

  return (
    <Link
      to={`/person/${person.nahar_id}`}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
    >
      {content}
    </Link>
  )
}
