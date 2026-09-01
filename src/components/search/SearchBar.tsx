import { Lock, Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Renders a locked, sign-in-prompting state instead of an active search input. */
  disabled?: boolean
  onDisabledClick?: () => void
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search by name, profession, or location…',
  disabled = false,
  onDisabledClick,
}: SearchBarProps) {
  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        className="glass flex h-14 w-full cursor-pointer items-center gap-3 rounded-full px-5 text-left text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--glass-bg-strong)]"
      >
        <Lock size={16} aria-hidden="true" />
        Sign in to search the family directory
      </button>
    )
  }

  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        aria-hidden="true"
      />
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search the family directory"
        className="glass h-14 w-full rounded-full pr-12 pl-12 text-base text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
