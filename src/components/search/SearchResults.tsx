import { motion } from 'framer-motion'
import type { SearchResult } from '../../lib/search'
import { PersonCard } from '../person/PersonCard'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
}

export function SearchResults({ results, query }: SearchResultsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {results.map(({ person }, i) => (
        <motion.div
          key={person.nahar_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i, 7) * 0.04, ease: 'easeOut' }}
        >
          <PersonCard person={person} highlight={query} />
        </motion.div>
      ))}
    </div>
  )
}
