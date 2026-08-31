import { useCallback, useEffect, useState } from 'react'
import type { Person } from '../data/schema'
import { dataSource } from '../lib/dataSource'

interface UsePeopleResult {
  people: Person[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function usePeople(): UsePeopleResult {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dataSource
      .getAllPeople()
      .then((result) => {
        if (!cancelled) setPeople(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { people, loading, error, refetch }
}

export function usePerson(id: string | undefined): { person: Person | null; loading: boolean } {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setPerson(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    dataSource.getPersonById(id).then((result) => {
      if (!cancelled) {
        setPerson(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  return { person, loading }
}
