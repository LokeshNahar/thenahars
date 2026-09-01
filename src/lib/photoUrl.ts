/**
 * Restricts profile photo URLs to a small set of known image hosts —
 * closes a real privacy gap (security audit F-07): an unrestricted photo
 * URL is rendered as a plain <img src>, so anyone with edit rights on a
 * profile could point it at a tracking pixel on their own server and log
 * every other member's IP address the moment they view that profile.
 * Firestore rules can't validate a URL's host, so this is enforced
 * client-side at the one place photo URLs are ever written (PersonEditForm).
 */

const ALLOWED_HOSTS = [
  // Google — profile photos, Drive-hosted images
  'googleusercontent.com',
  'drive.google.com',
  'lh3.googleusercontent.com',
  // Common free image hosts people actually paste links from
  'imgur.com',
  'i.imgur.com',
  // GitHub-hosted user content (e.g. avatars, uploaded images in gists/issues)
  'githubusercontent.com',
  'avatars.githubusercontent.com',
  // Firebase / Google Cloud Storage, for if this project ever moves to Blaze
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]

function hostIsAllowed(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return ALLOWED_HOSTS.some((allowed) => lower === allowed || lower.endsWith(`.${allowed}`))
}

/**
 * Validates a user-supplied photo URL. Returns null (valid, or intentionally
 * cleared) or an error message to show the user. Empty/whitespace-only input
 * is always valid — it means "no photo set."
 */
export function validatePhotoUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return 'That doesn’t look like a valid URL.'
  }

  if (url.protocol !== 'https:') {
    return 'Photo links must start with https://.'
  }

  if (!hostIsAllowed(url.hostname)) {
    return 'Photo links are only accepted from Google, Imgur, or GitHub — paste a direct image link from one of those, or leave this blank.'
  }

  return null
}
