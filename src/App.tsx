import { Footer } from './components/layout/Footer'
import { Navbar } from './components/layout/Navbar'
import { NotInTreeBanner } from './components/layout/NotInTreeBanner'
import { AppRoutes } from './router/routes'

function App() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[var(--color-background)]">
      <div className="mesh-glow" aria-hidden="true" />
      <Navbar />
      <NotInTreeBanner />
      <main className="relative z-10 flex-1">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  )
}

export default App
