export type Gender = 'male' | 'female' | 'other'
export type LifeStatus = 'living' | 'late'
export type MemberRole = 'member' | 'admin'

/**
 * The document at `people/{naharId}` — readable by any signed-in visitor
 * (even unmatched ones), because the tree's shape and the claim-matching
 * flow both need it. Deliberately holds NOTHING sensitive: no phone,
 * email, birth date, or location. See PrivatePersonDetails for those.
 */
export interface PublicPerson {
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
  /** nahar_id of whoever added this record via the app; null for seed/admin-created records. */
  addedBy: string | null
  /** Firestore server timestamp of creation via the app; null for seed/admin-created records. */
  addedAt: unknown
  /** True only when the private doc's `email` is a system-generated placeholder, not a real address. */
  isPlaceholderEmail: boolean
  /**
   * True if this person was born into the Nahar bloodline (so their own
   * parents, if ever added, extend the MAIN tree upward) — false if they
   * married in from outside (their own parents, if added, form a linked
   * external-family branch instead). Every child of a bloodline person is
   * also bloodline, regardless of gender; only a married-in spouse is false.
   */
  isBloodline: boolean
  /**
   * Set only on the root of a linked EXTERNAL family (e.g. a mother's own
   * birth family) — the nahar_id of the existing main-tree person this
   * branch connects through. Never a parents/spouse/children edge, so the
   * main tree's traversal (findRootId, buildFamilyUnit) never reaches it —
   * it's revealed only via a dedicated toggle near the connecting person.
   */
  linkedFamilyOf: string | null
  /** Short label for a linked-family root's toggle/breadcrumb, e.g. "Mother's Family". */
  linkedFamilyLabel: string | null
  status: LifeStatus
  /** Reserved for future phone-OTP self-claim. Always false for now. */
  claimed: boolean
  /** Reserved for future auth. Always "member" in seed data. */
  role: MemberRole
}

/**
 * The document at `people/{naharId}/private/details` — every field a
 * stranger should never see. Readable only by admins and any matched
 * member (see firestore.rules), never by an anonymous or unmatched
 * visitor. This is the actual privacy boundary; PublicPerson exists
 * purely so the tree's shape and name-based claim matching still work
 * without exposing anyone's contact details.
 */
export interface PrivatePersonDetails {
  phone: string | null
  /** ISO yyyy-mm-dd, so it sorts/compares naturally. Rendered as dd-mm-yyyy. */
  dateOfBirth: string | null
  /**
   * ISO yyyy-mm-dd wedding date, so it sorts/compares naturally. Rendered
   * as dd-mm-yyyy. A fact about the COUPLE, not just this person — kept in
   * sync on both spouses' private docs by the same edit (see
   * PersonEditForm), since spouse[] is a symmetric array rather than a
   * shared marriage record. Only meaningful when `spouse` is non-empty;
   * editing it when a person has more than one spouse recorded is a
   * not-yet-modeled edge case (assumes exactly one marriage per person,
   * like the rest of this schema does today).
   */
  marriageDate: string | null
  email: string | null
  profession: string | null
  /** Highest education/qualification — a QUALIFICATIONS value or free text. */
  qualification: string | null
  /** City/region only — street addresses are not stored for privacy. */
  location: string | null
  /** Relative path or URL; null falls back to a placeholder avatar. */
  photo: string | null
  /** Handle/username only, no @ or full URL — e.g. "johndoe". */
  instagram: string | null
  facebook: string | null
  /** LinkedIn public profile slug — e.g. "john-doe-123". */
  linkedin: string | null
  /** Free text, e.g. marking a stub/placeholder record. */
  notes?: string
}

/** Every PrivatePersonDetails key, for building Firestore payloads and the write-side field allowlist. */
export const PRIVATE_FIELD_KEYS = [
  'phone',
  'dateOfBirth',
  'marriageDate',
  'email',
  'profession',
  'qualification',
  'location',
  'photo',
  'instagram',
  'facebook',
  'linkedin',
  'notes',
] as const satisfies readonly (keyof PrivatePersonDetails)[]

/**
 * The merged, client-facing shape every component actually works with —
 * PublicPerson + PrivatePersonDetails combined by the data layer
 * (src/lib/dataSource.ts) after two separate, separately-authorized
 * Firestore reads. For a caller who can't read the private subcollection
 * (unmatched/anonymous), every PrivatePersonDetails field comes back null
 * rather than the read failing — see mergePersonDocs().
 */
export interface Person extends PublicPerson, PrivatePersonDetails {}

/** Records with this name are undocumented placeholders, not real people. */
export const PLACEHOLDER_NAME = 'Details coming soon'

export function isPlaceholder(person: Person): boolean {
  return person.name === PLACEHOLDER_NAME
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

/**
 * A signed-in-but-unmatched visitor's self-service request to be linked to
 * an existing Person record. Submitted with their own name + both parents'
 * names; the client suggests matchedNaharId when exactly one Person in the
 * tree has a name and parents-list that loosely match all three — but an
 * admin always makes the final call in AdminPage before any email gets
 * linked, so a wrong or missing match here is never itself a security
 * boundary, only a lookup convenience.
 */
export interface PendingClaim {
  /** Firestore doc id — the claimant's lowercased email, so at most one open claim exists per email. */
  id: string
  email: string
  submittedName: string
  fatherName: string
  motherName: string
  /** Client-suggested candidate when exactly one Person matched all three names; admin may pick differently. */
  matchedNaharId: string | null
  status: ClaimStatus
  submittedAt: unknown
  reviewedAt: unknown
  /** nahar_id of the admin who approved/rejected this claim. */
  reviewedBy: string | null
}
