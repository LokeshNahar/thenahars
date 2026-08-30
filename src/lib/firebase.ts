import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Firebase is intentionally inert unless VITE_USE_FIREBASE=true and real
 * config is supplied via .env.local — until then app/auth/db/storage are
 * all null and safe to import anywhere.
 *
 * storage is separately optional: Storage requires the Blaze plan and
 * isn't provisioned on any environment yet (no upload UI needs it), so
 * getStorage() is wrapped — an unprovisioned bucket can throw, and that
 * must not take down auth/db, which are both needed and Spark-plan-free.
 */
export const app: FirebaseApp | null = useFirebase ? initializeApp(firebaseConfig) : null
export const auth: Auth | null = app ? getAuth(app) : null
export const db: Firestore | null = app ? getFirestore(app) : null

let storageInstance: FirebaseStorage | null = null
if (app) {
  try {
    storageInstance = getStorage(app)
  } catch {
    storageInstance = null
  }
}
export const storage: FirebaseStorage | null = storageInstance
