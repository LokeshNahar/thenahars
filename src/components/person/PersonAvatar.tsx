import { User } from 'lucide-react'
import { useState } from 'react'
import type { Person } from '../../data/schema'

interface PersonAvatarProps {
  person: Person
  size?: 'sm' | 'md' | 'lg'
  /** True to always show the placeholder icon, hiding a real photo from unmatched visitors. */
  masked?: boolean
}

const SIZE_CLASSES: Record<NonNullable<PersonAvatarProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-28 w-28',
}

const ICON_SIZE: Record<NonNullable<PersonAvatarProps['size']>, number> = {
  sm: 18,
  md: 28,
  lg: 44,
}

export function PersonAvatar({ person, size = 'md', masked = false }: PersonAvatarProps) {
  const [errored, setErrored] = useState(false)
  const showPlaceholder = masked || !person.photo || errored

  return (
    <div
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]`}
    >
      {showPlaceholder ? (
        <User size={ICON_SIZE[size]} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
      ) : (
        <img
          src={person.photo ?? undefined}
          alt={person.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
