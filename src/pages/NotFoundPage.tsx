import { MagneticButton } from '../components/ui/MagneticButton'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-[var(--font-heading)] text-7xl font-bold text-[var(--color-accent)]">404</p>
      <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Page not found</h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        This branch of the tree doesn&rsquo;t exist yet.
      </p>
      <div className="mt-6">
        <MagneticButton to="/" variant="solid">
          Back to Home
        </MagneticButton>
      </div>
    </div>
  )
}
