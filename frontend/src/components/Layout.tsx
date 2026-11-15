import { NavLink, Outlet } from 'react-router'
import { useHealth } from '../api/queries'

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
        className={`size-2 ${up ? 'bg-accent' : isLoading ? 'bg-rule' : 'bg-danger'}`}
      />
      {label}
    </span>
  )
}

export function Layout() {
  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-paper focus:p-2">
        Skip to content
      </a>
      <header className="border-b border-ink">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4 md:px-10">
          <NavLink to="/" className="text-xl font-bold tracking-[-0.02em] text-ink no-underline">
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
                        isActive ? 'border-accent text-accent' : 'border-transparent text-ink hover:border-ink'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto">
            <ApiStatus />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
        <Outlet />
      </main>
    </div>
  )
}
