import type { Person } from '../data/schema'

const DDMMYYYY_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parses a dd-mm-yyyy string into canonical ISO yyyy-mm-dd for storage. Returns null if invalid. */
export function ddmmyyyyToIso(value: string): string | null {
  const match = DDMMYYYY_PATTERN.exec(value.trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  if (!isRealDate(Number(yyyy), Number(mm), Number(dd))) return null
  return `${yyyy}-${mm}-${dd}`
}

/** Formats a stored ISO yyyy-mm-dd date as dd-mm-yyyy for display. Returns the input unchanged if not ISO-shaped. */
export function isoToDdmmyyyy(value: string): string {
  const match = ISO_PATTERN.exec(value)
  if (!match) return value
  const [, yyyy, mm, dd] = match
  return `${dd}-${mm}-${yyyy}`
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

/** True if `person.dateOfBirth` falls on today's month+day, regardless of birth year. */
export function isBirthdayToday(person: Person, today: Date = new Date()): boolean {
  if (!person.dateOfBirth) return false
  const match = ISO_PATTERN.exec(person.dateOfBirth)
  if (!match) return false
  const [, , mm, dd] = match
  const todayMm = String(today.getMonth() + 1).padStart(2, '0')
  const todayDd = String(today.getDate()).padStart(2, '0')
  return mm === todayMm && dd === todayDd
}

/** Age in whole years as of `today`, or null if no birth date is recorded. */
export function ageInYears(person: Person, today: Date = new Date()): number | null {
  if (!person.dateOfBirth) return null
  const match = ISO_PATTERN.exec(person.dateOfBirth)
  if (!match) return null
  const [, yyyy, mm, dd] = match
  const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}
