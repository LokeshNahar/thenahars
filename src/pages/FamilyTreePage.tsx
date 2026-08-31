import { useSearchParams } from 'react-router-dom'
import { FamilyTreeCanvas } from '../components/tree/FamilyTreeCanvas'
import { useAuth } from '../context/AuthContext'
import { usePeople } from '../hooks/usePeople'

export function FamilyTreePage() {
  const { people, loading } = usePeople()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // Explicit ?focus= wins; otherwise, if you're signed in and linked, the
  // tree auto-frames you — visiting /tree while logged in just works.
  const focusId = searchParams.get('focus') ?? user?.naharId ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-[var(--font-heading)] text-4xl font-bold text-[var(--color-foreground)]">
          The Family Tree
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted-foreground)]">
          Pan, zoom, and tap the arrow beneath any couple to reveal their children.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-[var(--color-muted-foreground)]">Loading tree…</p>
      ) : (
        <FamilyTreeCanvas people={people} focusId={focusId} />
      )}
    </div>
  )
}
