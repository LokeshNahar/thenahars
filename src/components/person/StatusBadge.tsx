import type { LifeStatus } from '../../data/schema'

export function StatusBadge({ status }: { status: LifeStatus }) {
  if (status !== 'late') return null

  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
      In loving memory
    </span>
  )
}
