import { lazy, Suspense } from 'react'
import { Hero } from '../components/home/Hero'
import { TodaysCelebrations } from '../components/home/TodaysCelebrations'
import { TreePreview } from '../components/home/TreePreview'
import { usePeople } from '../hooks/usePeople'

const LionHeroSection = lazy(() =>
  import('../components/three/LionHeroSection').then((m) => ({ default: m.LionHeroSection })),
)

export function HomePage() {
  const { people } = usePeople()

  return (
    <div>
      <Suspense fallback={<Hero />}>
        <LionHeroSection>
          <Hero />
        </LionHeroSection>
      </Suspense>
      <TreePreview people={people} />
      <TodaysCelebrations people={people} />
    </div>
  )
}
