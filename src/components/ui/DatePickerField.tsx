import { Calendar } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { ddmmyyyyToIso, isoToDdmmyyyy } from '../../lib/dateOfBirth'

interface DatePickerFieldProps {
  /** Stored ISO yyyy-mm-dd, or empty string if unset. */
  value: string
  onChange: (isoValue: string) => void
  /** Used to build the fields' aria-labels, e.g. "Date of birth" or "Anniversary". */
  label?: string
  className?: string
}

/**
 * Pairs a native `<input type="date">` (browser calendar popup) with a
 * typed dd-mm-yyyy text field — either one commits the same ISO value, per
 * the "pick from a calendar OR type dd-mm-yyyy" requirement. The native
 * date input's own typed entry is locale-dependent (often mm/dd/yyyy in en-US),
 * so the text field is what actually guarantees dd-mm-yyyy typing works
 * regardless of the visitor's browser locale. Generic — used for both
 * date of birth and marriage-anniversary date fields.
 */
export function DatePickerField({ value, onChange, label = 'Date', className }: DatePickerFieldProps) {
  const textId = useId()
  const dateId = useId()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [textValue, setTextValue] = useState(() => (value ? isoToDdmmyyyy(value) : ''))
  const [textError, setTextError] = useState(false)

  function openCalendar() {
    const input = dateInputRef.current
    if (!input) return
    // showPicker() is the reliable way to open a native date input's
    // calendar programmatically — supported in Chrome/Edge/Safari. Falls
    // back to focusing the (now-visible, real-sized) input so at least
    // keyboard/click-to-open still works in browsers without it (Firefox).
    if ('showPicker' in input) {
      try {
        ;(input as HTMLInputElement & { showPicker: () => void }).showPicker()
        return
      } catch {
        // Fall through to focus() below — showPicker() throws if the
        // input isn't user-activated-clickable in some edge cases.
      }
    }
    input.focus()
  }

  function handleTextChange(next: string) {
    setTextValue(next)
    if (next.trim() === '') {
      setTextError(false)
      onChange('')
      return
    }
    const iso = ddmmyyyyToIso(next)
    if (iso) {
      setTextError(false)
      onChange(iso)
    } else {
      setTextError(true)
    }
  }

  function handleDateChange(iso: string) {
    setTextValue(iso ? isoToDdmmyyyy(iso) : '')
    setTextError(false)
    onChange(iso)
  }

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <div className="relative flex-1">
        <input
          id={textId}
          type="text"
          inputMode="numeric"
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="dd-mm-yyyy"
          aria-label={`${label} (dd-mm-yyyy)`}
          aria-invalid={textError || undefined}
          className={`w-full rounded-xl border bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] ${
            textError ? 'border-[var(--color-destructive)]' : 'border-[var(--glass-border)]'
          }`}
        />
      </div>
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        title="Pick from calendar"
      >
        <Calendar size={16} className="pointer-events-none" aria-hidden="true" />
        {/* Kept at real size and clickable, just visually transparent (not
            display:none/sr-only) — Chrome refuses to open a native date
            picker on an input with no real layout box, which is what broke
            the previous sr-only-label version of this control. Overlaid
            directly on the calendar icon so a click anywhere on it opens
            the native picker itself; showPicker() covers keyboard/other
            activation as a fallback. */}
        <input
          id={dateId}
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={(e) => handleDateChange(e.target.value)}
          onClick={openCalendar}
          aria-label={`Pick ${label.toLowerCase()} from calendar`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}
