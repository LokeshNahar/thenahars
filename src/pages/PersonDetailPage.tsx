import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PersonDetail } from '../components/person/PersonDetail'
import { usePeople } from '../hooks/usePeople'

export function PersonDetailPage() {
  const { naharId } = useParams<{ naharId: string }>()
  const { people, loading, refetch } = usePeople()

  const person = useMemo(() => people.find((p) => p.nahar_id === naharId) ?? null, [people, naharId])
  const parents = useMemo(
    () => (person ? people.filter((p) => person.parents.includes(p.nahar_id)) : []),
    [people, person],
  )
  const spouses = useMemo(
    () => (person ? people.filter((p) => person.spouse.includes(p.nahar_id)) : []),
    [people, person],
  )
  const offspring = useMemo(
    () => (person ? people.filter((p) => person.children.includes(p.nahar_id)) : []),
    [people, person],
  )

  if (loading) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--color-muted-foreground)]">
        Loading…
      </p>
    )
  }

  if (!person) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[var(--color-foreground)]">We couldn&rsquo;t find that family member.</p>
        <Link to="/directory" className="mt-4 inline-block text-[var(--color-accent)] hover:underline">
          Back to Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PersonDetail
        person={person}
        parents={parents}
        spouses={spouses}
        offspring={offspring}
        people={people}
        onSaved={refetch}
      />
    </div>
  )
}
