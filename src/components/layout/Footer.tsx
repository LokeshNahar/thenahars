export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <p className="font-[var(--font-heading)] text-lg text-[var(--color-foreground)]">The Nahars</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          A living record of our family, generation to generation.
        </p>
        <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          &copy; {new Date().getFullYear()} The Nahar Family
        </p>
      </div>
    </footer>
  )
}
