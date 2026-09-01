import { Navigate } from 'react-router-dom'
import { ClaimProfileForm } from '../components/person/ClaimProfileForm'
import { useAuth } from '../context/AuthContext'

export function ClaimProfilePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--color-muted-foreground)]">
        Loading…
      </p>
    )
  }

  // Nothing to claim if you're not signed in, or already matched.
  if (!user || user.naharId) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <ClaimProfileForm />
    </div>
  )
}
