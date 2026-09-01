import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 5-minute idle-timeout session control (PHONE-OTP-FUTURE-PHASE.md standing
 * requirement, modeled on the Income Tax e-filing portal): a signed-in
 * session warns at 4 minutes of inactivity and expires at 5 unless the user
 * extends. Idle, not fixed-window — any real activity (mouse, keyboard,
 * click, scroll, touch, navigation) pushes the clock back out, so an
 * actively-used session never interrupts itself.
 *
 * Last-activity time lives in sessionStorage (not localStorage) so it
 * doesn't survive closing the tab — consistent with the session-only auth
 * persistence already set in src/lib/firebase.ts. Storing the timestamp
 * (not just an in-memory ref) also means a page reload mid-session doesn't
 * silently reset the idle clock, which would defeat the point.
 */

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const WARNING_LEAD_MS = 60 * 1000
const TICK_MS = 1000
const STORAGE_KEY = 'nahars-last-activity'
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
/** How often activity listeners are allowed to actually write the timestamp — avoids a sessionStorage write on every pixel of mousemove. */
const ACTIVITY_THROTTLE_MS = 5000

export type SessionTimerStatus = 'active' | 'warning' | 'expired'

interface UseIdleSessionTimerResult {
  status: SessionTimerStatus
  /** Seconds remaining before expiry — only meaningful once status is 'warning'. */
  secondsRemaining: number
  /** Resets the idle clock, same as any tracked user activity would. */
  extend: () => void
  /** Clears an 'expired' status back to 'active' without resetting the idle clock's storage — call after the user re-signs-in and dismisses the expired screen. */
  acknowledgeExpiry: () => void
}

function readLastActivity(): number {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  const parsed = stored ? Number(stored) : NaN
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function writeLastActivity(time: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(time))
  } catch {
    // Storage unavailable (private mode, quota) — timer falls back to
    // in-memory-only behavior for this tick, which is an acceptable
    // degradation, not a security regression (still expires, just won't
    // survive a reload mid-session).
  }
}

interface TimerOverrides {
  idleTimeoutMs: number
  warningLeadMs: number
  tickMs: number
}

/**
 * Dev-only timing override so this state machine can be end-to-end tested
 * in seconds instead of literally waiting 5 minutes — set on
 * window.__naharTestSessionTimerOverrides before mount. Same
 * import.meta.env.DEV-gated pattern as the __naharTestSignIn hook in
 * AuthContext.tsx; dead-code-eliminated from any `npm run build` output,
 * so this can never reach production regardless of what's on `window`.
 */
function readOverrides(): TimerOverrides {
  if (import.meta.env.DEV) {
    const w = window as unknown as { __naharTestSessionTimerOverrides?: Partial<TimerOverrides> }
    const o = w.__naharTestSessionTimerOverrides
    if (o) {
      return {
        idleTimeoutMs: o.idleTimeoutMs ?? IDLE_TIMEOUT_MS,
        warningLeadMs: o.warningLeadMs ?? WARNING_LEAD_MS,
        tickMs: o.tickMs ?? TICK_MS,
      }
    }
  }
  return { idleTimeoutMs: IDLE_TIMEOUT_MS, warningLeadMs: WARNING_LEAD_MS, tickMs: TICK_MS }
}

/**
 * enabled=false stops the idle clock from running (no listeners, no tick)
 * but deliberately does NOT reset an already-'expired' status back to
 * 'active' — the caller becoming signed-out (which is what setting
 * enabled=false actually means here, since expiry itself calls signOut())
 * must not make the expired screen vanish out from under the user. Only
 * acknowledgeExpiry() (after they explicitly re-sign-in) clears it.
 */
export function useIdleSessionTimer(enabled: boolean): UseIdleSessionTimerResult {
  const [status, setStatus] = useState<SessionTimerStatus>('active')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const lastThrottledWrite = useRef(0)
  const statusRef = useRef<SessionTimerStatus>('active')

  const setStatusBoth = useCallback((next: SessionTimerStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const extend = useCallback(() => {
    const now = Date.now()
    writeLastActivity(now)
    lastThrottledWrite.current = now
    setStatusBoth('active')
  }, [setStatusBoth])

  const acknowledgeExpiry = useCallback(() => {
    writeLastActivity(Date.now())
    lastThrottledWrite.current = Date.now()
    setStatusBoth('active')
  }, [setStatusBoth])

  useEffect(() => {
    if (!enabled) {
      // Do NOT touch status here — see the doc comment above. Just stop
      // the clock from ticking further while there's no session to track.
      return
    }

    const { idleTimeoutMs, warningLeadMs, tickMs } = readOverrides()

    writeLastActivity(Date.now())

    function onActivity() {
      // While actively expired, activity shouldn't silently resurrect the
      // session — only the explicit "Extend Session" action should.
      if (statusRef.current === 'expired') return
      const now = Date.now()
      if (now - lastThrottledWrite.current < ACTIVITY_THROTTLE_MS) return
      lastThrottledWrite.current = now
      writeLastActivity(now)
    }

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true })
    }

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - readLastActivity()
      const remaining = idleTimeoutMs - elapsed

      if (remaining <= 0) {
        setStatusBoth('expired')
      } else if (remaining <= warningLeadMs) {
        statusRef.current = 'warning'
        setStatus('warning')
        setSecondsRemaining(Math.ceil(remaining / 1000))
      } else {
        setStatusBoth('active')
      }
    }, tickMs)

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity)
      }
      window.clearInterval(tick)
    }
  }, [enabled, setStatusBoth])

  return { status, secondsRemaining, extend, acknowledgeExpiry }
}
