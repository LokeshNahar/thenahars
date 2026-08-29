import { Hero } from '../components/home/Hero'
import { TreePreview } from '../components/home/TreePreview'
import { usePeople } from '../hooks/usePeople'

export function HomePage() {
  const { people } = usePeople()

  return (
    <div>
      <Hero />
      <TreePreview people={people} />
    </div>
  )
}
