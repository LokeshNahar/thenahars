import { createContext, useContext, type ReactNode } from 'react'

export interface AuthUser {
  email: string
  naharId: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Phase 1: always signed out. Phase 2 will swap this provider's internals
 * for real Firebase Auth (Google Sign-In) without changing any consumer —
 * components can already branch on `user` even though it's always null today.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    signIn: () => {
      console.warn('Sign-in is not available yet — coming in a future update.')
    },
    signOut: () => {},
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
