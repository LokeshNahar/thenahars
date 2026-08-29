import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { PersonCard } from '../components/person/PersonCard'
import { SearchBar } from '../components/search/SearchBar'
import { SearchEmptyState } from '../components/search/SearchEmptyState'
import { SearchResults } from '../components/search/SearchResults'
import { isPlaceholder } from '../data/schema'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePeople } from '../hooks/usePeople'
import { searchPeople } from '../lib/search'

export function DirectoryPage() {
  const { people, loading } = usePeople()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)

  const results = useMemo(() => searchPeople(people, debouncedQuery), [people, debouncedQuery])
  const allMembers = useMemo(() => people.filter((p) => !isPlaceholder(p)), [people])

  const isSearching = debouncedQuery.trim().length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h1 className="font-[var(--font-heading)] text-4xl font-bold text-[var(--color-foreground)]">
          Family Directory
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted-foreground)]">
          Find any family member by name, profession, or location.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mb-12 max-w-xl"
      >
        <SearchBar value={query} onChange={setQuery} />
      </motion.div>

      {loading ? (
        <p className="text-center text-[var(--color-muted-foreground)]">Loading directory…</p>
      ) : isSearching ? (
        results.length > 0 ? (
          <SearchResults results={results} query={debouncedQuery} />
        ) : (
          <SearchEmptyState query={debouncedQuery} />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {allMembers.map((person, i) => (
            <motion.div
              key={person.nahar_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 7) * 0.04, ease: 'easeOut' }}
            >
              <PersonCard person={person} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
