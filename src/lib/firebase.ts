import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check'
import { browserSessionPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth'
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

/**
 * Session-only persistence: signing in stays valid only for this browser
 * tab/window session, not indefinitely across restarts (Firebase's default
 * is browserLocalPersistence, which survives closing the browser entirely).
 * Closing this security-audit gap (F-05: a stolen or shared device stays
 * signed in forever) — the full fix is a 5-minute auto-expiring session
 * with an explicit "Extend Session" action, scoped in
 * PHONE-OTP-FUTURE-PHASE.md but not yet built; this is the immediate,
 * no-new-UI narrowing of the same exposure window. Fire-and-forget is safe
 * here: the Auth SDK queues sign-in calls until persistence resolves, so
 * nothing downstream needs to await this.
 */
if (auth) {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.error('Failed to set session-only auth persistence:', err)
  })
}

let storageInstance: FirebaseStorage | null = null
if (app) {
  try {
    storageInstance = getStorage(app)
  } catch {
    storageInstance = null
  }
}
export const storage: FirebaseStorage | null = storageInstance

/**
 * App Check attaches a per-request attestation token so Firestore/Auth can
 * tell "a real build of this app, running in a real browser" apart from a
 * scripted client hitting the API directly — closes the low-severity
 * "no rate limit on writes" gap from the security audit (App Check itself
 * doesn't rate-limit, but it's what makes Firestore's abuse protections
 * apply only to genuine traffic instead of anyone with the public API key).
 *
 * Free on Spark. Only initializes when VITE_RECAPTCHA_SITE_KEY is set — a
 * reCAPTCHA v3 site key from Firebase Console -> App Check -> Apps ->
 * (this web app) -> reCAPTCHA v3 provider. Until that key is added to
 * .env.local, this silently no-ops (appCheck stays null) rather than
 * breaking the build or blocking anyone — App Check enforcement is a
 * separate, per-service toggle in the Console (Firestore/Auth -> App
 * Check -> Enforce), left OFF by default, so initializing the SDK here is
 * safe on its own: it starts attaching tokens, but nothing rejects a
 * request without one until enforcement is explicitly turned on later.
 */
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined
let appCheckInstance: AppCheck | null = null
if (app && recaptchaSiteKey) {
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (err) {
    console.error('Failed to initialize App Check:', err)
    appCheckInstance = null
  }
}
export const appCheck: AppCheck | null = appCheckInstance
