import type { Person } from '../../data/schema'

interface SocialLinksProps {
  person: Person
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 8.5h2.5V5H14c-2.2 0-4 1.8-4 4v2H8v3.5h2V21h3.5v-6.5H16l.5-3.5h-3V9c0-.5.5-1 1.5-1z"
        fill="currentColor"
      />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7" cy="8" r="1.3" fill="currentColor" />
      <path
        d="M7 11v7M11 11v7M11 14c0-1.5 1-3 3-3s3 1.5 3 3v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

const PLATFORMS: Array<{
  key: 'instagram' | 'facebook' | 'linkedin'
  label: string
  icon: () => React.ReactElement
  url: (handle: string) => string
}> = [
  { key: 'instagram', label: 'Instagram', icon: InstagramIcon, url: (h) => `https://instagram.com/${h}` },
  { key: 'facebook', label: 'Facebook', icon: FacebookIcon, url: (h) => `https://facebook.com/${h}` },
  { key: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon, url: (h) => `https://linkedin.com/in/${h}` },
]

export function SocialLinks({ person }: SocialLinksProps) {
  const active = PLATFORMS.filter((p) => person[p.key])
  if (active.length === 0) return null

  return (
    <div className="mt-1 flex items-center gap-2">
      {active.map(({ key, label, icon: Icon, url }) => (
        <a
          key={key}
          href={url(person[key]!)}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${person.name} on ${label}`}
          className="glass flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          <Icon />
        </a>
      ))}
    </div>
  )
}
