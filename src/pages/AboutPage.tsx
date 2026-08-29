export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-[var(--font-heading)] text-4xl font-bold text-[var(--color-foreground)]">
        About This Project
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-[var(--color-muted-foreground)]">
        <p>
          The Nahars is a living family tree and directory, started to keep track of our large and growing
          extended family — names, professions, locations, and the connections between us — all in one place.
        </p>
        <p>
          This is an early version. It currently traces one branch of the family, beginning with Late Shri
          Bhanwar Lal Nahar and Late Shrimati Bhanwari Devi Nahar. More branches, photos, and details will be
          added over time.
        </p>
        <p>
          Know someone who should be listed, or spot something that needs correcting? Reach out to a family
          admin.
        </p>
      </div>
    </div>
  )
}
