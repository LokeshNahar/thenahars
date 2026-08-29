import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX size={32} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
      <p className="text-[var(--color-foreground)]">
        No results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
      </p>
      <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
        Try a different spelling, or search by profession or location instead of a full name.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          to="/tree"
          className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
        >
          Browse the family tree
        </Link>
        <Link
          to="/about"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-opacity hover:opacity-90"
        >
          Know someone missing?
        </Link>
      </div>
    </div>
  )
}
