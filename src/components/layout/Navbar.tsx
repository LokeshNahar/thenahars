import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="sticky top-3 z-50 px-3 sm:top-4 sm:px-6">
      <header className="glass mx-auto max-w-6xl rounded-2xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
          <NavLink
            to="/"
            className="font-[var(--font-heading)] text-lg font-semibold tracking-tight text-[var(--color-foreground)] sm:text-xl"
            onClick={() => setOpen(false)}
          >
            The Nahars
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => {
              const isActive =
                item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/'}
                  className="relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200"
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      isActive ? 'text-[var(--color-accent-foreground)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden border-t border-[var(--glass-border)] md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {siteConfig.nav.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-3 text-base font-medium ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                          : 'text-[var(--color-muted-foreground)]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </div>
  )
}
