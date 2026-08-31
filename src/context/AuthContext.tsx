import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { MemberRole } from '../data/schema'
import { auth, db } from '../lib/firebase'

export interface AuthUser {
  email: string
  /** null = signed in with Google but not yet linked to a person record. */
  naharId: string | null
  name: string | null
  photoURL: string | null
  role: MemberRole | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function resolveAuthUser(
  email: string,
  googleName: string | null,
  googlePhoto: string | null,
): Promise<AuthUser> {
  if (!db) return { email, naharId: null, name: googleName, photoURL: googlePhoto, role: null }

  const lookup = await getDoc(doc(db, 'people_by_email', email.toLowerCase()))
  if (!lookup.exists()) {
    return { email, naharId: null, name: googleName, photoURL: googlePhoto, role: null }
  }

  const naharId = lookup.data().nahar_id as string
  const person = await getDoc(doc(db, 'people', naharId))
  if (!person.exists()) {
    return { email, naharId: null, name: googleName, photoURL: googlePhoto, role: null }
  }

  const data = person.data()
  return {
    email,
    naharId,
    name: (data.name as string) ?? googleName,
    photoURL: googlePhoto,
    role: (data.role as MemberRole) ?? 'member',
  }
}

/**
 * Real Firebase Auth (Google Sign-In) when configured — inert (always
 * signed out) when VITE_USE_FIREBASE is off, same contract firebase.ts
 * already established, so this never crashes local dev without Firebase.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.email) {
        setUser(null)
        setLoading(false)
        return
      }
      const resolved = await resolveAuthUser(
        firebaseUser.email,
        firebaseUser.displayName,
        firebaseUser.photoURL,
      )
      setUser(resolved)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  function signIn() {
    if (!auth) {
      console.warn('Sign-in is not available — Firebase is not configured for this environment.')
      return
    }
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => {
      console.error('Sign-in failed:', err)
    })
  }

  function signOut() {
    if (!auth) return
    firebaseSignOut(auth).catch((err) => {
      console.error('Sign-out failed:', err)
    })
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
