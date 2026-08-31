/**
 * Common Indian educational qualifications, roughly ordered by typical
 * progression (schooling -> undergrad -> postgrad -> doctoral -> professional).
 * Not exhaustive by design — the edit form always offers a free-text
 * "Other" fallback for anything not listed here.
 */
export const QUALIFICATIONS = [
  'Below X',
  'X (Secondary/SSC)',
  'XII (Higher Secondary/HSC)',
  'Diploma',
  'ITI',
  'BA',
  'BSc',
  'BCom',
  'BBA',
  'BCA',
  'BE / BTech',
  'BArch',
  'BPharm',
  'LLB',
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BEd',
  'MA',
  'MSc',
  'MCom',
  'MBA',
  'MCA',
  'ME / MTech',
  'MArch',
  'MPharm',
  'LLM',
  'MD',
  'MS (Medicine)',
  'MEd',
  'PhD',
  'CA (Chartered Accountant)',
  'CS (Company Secretary)',
  'CMA / ICWA',
  'CFA',
] as const

/**
 * Common broad occupation categories seen in an Indian family context.
 * Deliberately a mix of professions and sectors rather than exact job
 * titles, since the free-text "Other" option covers anything specific.
 */
export const OCCUPATIONS = [
  'Business / Trade',
  'Chartered Accountant',
  'Company Secretary',
  'Doctor',
  'Engineer',
  'Architect',
  'Lawyer / Advocate',
  'Teacher / Professor',
  'Software / IT Professional',
  'Banker / Finance Professional',
  'Government Service',
  'Civil Services',
  'Defence / Armed Forces',
  'Homemaker',
  'Student',
  'Farmer / Agriculture',
  'Retired',
  'Consultant',
  'Entrepreneur / Startup Founder',
  'Real Estate',
  'Jeweller / Gems & Jewellery',
  'Textile / Garment Business',
  'Medical Professional (Nurse/Pharmacist etc.)',
  'Artist / Designer',
  'Journalist / Media',
  'Civil Servant (State/Central)',
  'Self-Employed / Freelancer',
] as const

/** Sentinel value used in a <select> for "let me type my own". */
export const OTHER_OPTION = '__other__'
