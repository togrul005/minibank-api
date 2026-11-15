import { Link } from 'react-router'
import { linkButton } from '../components/ui'

export function NotFoundPage() {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted">Error 404</p>
      <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.03em] md:text-7xl">Page not found</h1>
      <Link to="/" className={`${linkButton.secondary} mt-8`}>Back to overview</Link>
    </div>
  )
}
