import { useState } from 'react'
import { OTHER_OPTION } from '../../lib/qualifications'

interface SelectWithOtherProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  selectClassName: string
  inputClassName: string
}

/**
 * A <select> of common options plus a sentinel "Other" choice that swaps in
 * a free-text input. If the incoming value isn't one of the known options
 * (e.g. it was previously custom-entered), starts already in text mode.
 */
export function SelectWithOther({
  id,
  value,
  onChange,
  options,
  placeholder = 'Not set',
  selectClassName,
  inputClassName,
}: SelectWithOtherProps) {
  const [customMode, setCustomMode] = useState(() => value !== '' && !options.includes(value))

  if (customMode) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false)
            onChange('')
          }}
          className="shrink-0 cursor-pointer rounded-xl border border-[var(--glass-border)] px-3 text-xs font-semibold text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
        >
          Choose
        </button>
      </div>
    )
  }

  return (
    <select
      id={id}
      className={selectClassName}
      value={value === '' ? '' : options.includes(value) ? value : OTHER_OPTION}
      onChange={(e) => {
        if (e.target.value === OTHER_OPTION) {
          setCustomMode(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      <option value={OTHER_OPTION}>Other…</option>
    </select>
  )
}
