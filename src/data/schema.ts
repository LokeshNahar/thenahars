export type Gender = 'male' | 'female' | 'other'
export type LifeStatus = 'living' | 'late'
export type MemberRole = 'member' | 'admin'

export interface Person {
  /** Primary key. Sequential, zero-padded: "N-0001". Never reused or renumbered. */
  nahar_id: string
  name: string
  gender: Gender
  /** 1 = root generation of the currently tracked tree, increasing downward. */
  generation: number
  /** Blood parents only. A married-in spouse has no parents in this tree. */
  parents: string[]
  /** Spouse(s) by nahar_id — spouses have their own real Person record. */
  spouse: string[]
  children: string[]
  phone: string | null
  email: string | null
  profession: string | null
  /** City/region only — street addresses are not stored for privacy. */
  location: string | null
  /** Relative path or URL; null falls back to a placeholder avatar. */
  photo: string | null
  /** Handle/username only, no @ or full URL — e.g. "johndoe". */
  instagram: string | null
  facebook: string | null
  /** LinkedIn public profile slug — e.g. "john-doe-123". */
  linkedin: string | null
  status: LifeStatus
  /** Reserved for future phone-OTP self-claim. Always false for now. */
  claimed: boolean
  /** Reserved for future auth. Always "member" in seed data. */
  role: MemberRole
  /** Free text, e.g. marking a stub/placeholder record. */
  notes?: string
}

/** Records with this name are undocumented placeholders, not real people. */
export const PLACEHOLDER_NAME = 'Details coming soon'

export function isPlaceholder(person: Person): boolean {
  return person.name === PLACEHOLDER_NAME
}
