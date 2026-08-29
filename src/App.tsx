import { Footer } from './components/layout/Footer'
import { Navbar } from './components/layout/Navbar'
import { AppRoutes } from './router/routes'

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  )
}

export default App
