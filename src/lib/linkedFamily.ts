/**
 * Default display text for a linked-family branch when its creator didn't
 * type a custom `linkedFamilyLabel`. Kept in one place so the toggle button,
 * the tree's corner badge, and the full-screen takeover header can never
 * drift into different wording for the same fallback case.
 */

/** First name only, e.g. "Vanita Nahar" -> "Vanita". */
function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

/**
 * Button/badge text — action-led so it reads as "do something" rather than
 * a flat restatement of whose family this is (the old "Vanita's Family"
 * wording, sitting right next to a page already titled "Vanita", read as
 * meaningless repetition rather than an invitation to explore).
 */
export function linkedFamilyToggleLabel(anchorName: string): string {
  return `Explore ${firstName(anchorName)}'s Side of the Family`
}

/** Takeover header title — a custom label wins; otherwise a clearer fallback than the bare "{Name}'s Family". */
export function linkedFamilyHeaderTitle(anchorName: string): string {
  return `${firstName(anchorName)}'s Side of the Family`
}
