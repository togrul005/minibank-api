import { NavLink, Outlet, useLocation } from 'react-router'
import { useId } from 'react'
import { useHealth } from '../api/queries'
import { themes, useTheme, type ThemeId } from '../theme'

const nav = [
  { to: '/', label: 'Overview', end: true },
  { to: '/accounts', label: 'Accounts' },
  { to: '/transfer', label: 'Transfer' },
  { to: '/history', label: 'History' },
]

function ApiStatus() {
  const { data, isError, isLoading } = useHealth()
  const up = data?.status === 'UP'
  const label = isLoading ? 'Checking API…' : up ? 'API online' : isError ? 'API offline' : `API ${data?.status ?? 'unknown'}`
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" aria-live="polite">
      <span
        aria-hidden="true"
        className={`size-2 ${up ? 'status-dot bg-accent' : isLoading ? 'bg-rule' : 'bg-danger'}`}
      />
      {label}
    </span>
  )
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const id = useId()
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted">Theme</label>
      <select
        id={id}
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        className="min-h-9 rounded-control border border-rule bg-surface px-2 text-sm font-bold text-ink"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </span>
  )
}

export function Layout() {
  const location = useLocation()
  return (
    <div className="min-h-screen">
      {/* decorative background: gradient blobs (Aurora), grain (Organic), scanlines + grid (Retro) */}
      <div className="theme-bg" aria-hidden="true"><span /><span /><span /></div>

      <div className="app-shell">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-paper focus:p-2">
          Skip to content
        </a>
        <header className="app-header">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4 md:px-10">
            <NavLink to="/" className="font-display text-xl font-bold tracking-[-0.02em] text-ink no-underline">
              MiniBank
            </NavLink>
            <nav aria-label="Main" className="order-3 w-full md:order-none md:w-auto">
              <ul className="flex gap-1 overflow-x-auto">
                {nav.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-bold transition-colors duration-200 ${
                          isActive ? 'nav-active border-accent text-accent' : 'border-transparent text-ink hover:border-line'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
              <ThemeSwitcher />
              <ApiStatus />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
          {/* keyed by path so each page plays its enter animation */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
