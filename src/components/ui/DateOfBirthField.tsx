import { Calendar } from 'lucide-react'
import { useId, useState } from 'react'
import { ddmmyyyyToIso, isoToDdmmyyyy } from '../../lib/dateOfBirth'

interface DateOfBirthFieldProps {
  /** Stored ISO yyyy-mm-dd, or empty string if unset. */
  value: string
  onChange: (isoValue: string) => void
  className?: string
}

/**
 * Pairs a native `<input type="date">` (browser calendar popup) with a
 * typed dd-mm-yyyy text field — either one commits the same ISO value, per
 * the "pick from a calendar OR type dd-mm-yyyy" requirement. The native
 * date input's own typed entry is locale-dependent (often mm/dd/yyyy in en-US),
 * so the text field is what actually guarantees dd-mm-yyyy typing works
 * regardless of the visitor's browser locale.
 */
export function DateOfBirthField({ value, onChange, className }: DateOfBirthFieldProps) {
  const textId = useId()
  const dateId = useId()
  const [textValue, setTextValue] = useState(() => (value ? isoToDdmmyyyy(value) : ''))
  const [textError, setTextError] = useState(false)

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
          aria-label="Date of birth (dd-mm-yyyy)"
          aria-invalid={textError || undefined}
          className={`w-full rounded-xl border bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] ${
            textError ? 'border-[var(--color-destructive)]' : 'border-[var(--glass-border)]'
          }`}
        />
      </div>
      <label
        htmlFor={dateId}
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        title="Pick from calendar"
      >
        <Calendar size={16} aria-hidden="true" />
        <input
          id={dateId}
          type="date"
          value={value}
          onChange={(e) => handleDateChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  )
}
