import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-[var(--font-heading)] text-6xl font-bold text-[var(--color-accent)]">404</p>
      <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Page not found</h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        This branch of the tree doesn&rsquo;t exist yet.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  )
}
