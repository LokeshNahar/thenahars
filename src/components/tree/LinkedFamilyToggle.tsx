import { Users } from 'lucide-react'

interface LinkedFamilyToggleProps {
  label: string
  onClick: () => void
  /** Compact corner-badge styling for use on a tree node; defaults to a full pill for detail pages. */
  compact?: boolean
}

export function LinkedFamilyToggle({ label, onClick, compact = false }: LinkedFamilyToggleProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        title={`Open ${label}`}
        aria-label={`Open ${label}`}
        className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--color-linked-accent)] text-white shadow-[var(--shadow-elevated)] transition-transform hover:scale-110"
      >
        <Users size={11} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--color-linked-accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-linked-accent)] transition-colors hover:bg-[var(--color-linked-accent)]/20"
    >
      <Users size={14} aria-hidden="true" />
      {label}
    </button>
  )
}
