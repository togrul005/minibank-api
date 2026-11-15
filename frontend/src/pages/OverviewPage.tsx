import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useAllAccounts, useRecentActivity } from '../api/queries'
import { BigAmount, LoadingLine, Notice, Section, linkButton } from '../components/ui'
import { MovementTable } from '../components/MovementTable'
import { formatDate, formatMoney } from '../lib/money'

export function OverviewPage() {
  const accounts = useAllAccounts()
  const list = accounts.data?.content ?? []
  const total = list.reduce((sum, a) => sum + a.balance, 0)
  const activity = useRecentActivity(list.slice(0, 10).map((a) => a.id))

  if (accounts.isLoading) return <LoadingLine>Loading accounts…</LoadingLine>
  if (accounts.error) return <Notice tone="error" title="Couldn’t load accounts">{accounts.error.message}</Notice>

  if (list.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-5xl font-bold leading-none tracking-[-0.03em] md:text-7xl">No accounts yet</h1>
        <p className="mt-4 text-lg text-muted">Open your first account to start moving money.</p>
        <Link to="/accounts" className={`${linkButton.primary} mt-8`}>Open an account</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="text-sm font-bold uppercase tracking-[0.08em]">Total balance</p>
          <h1 className="mt-4">
            <span className="sr-only">Total balance </span>
            <BigAmount value={total} size="xl" />
          </h1>
        </div>
        <div className="flex flex-col justify-end gap-3 border-l-0 border-rule md:col-span-4 md:border-l md:pl-8">
          <p className="text-muted">
            <span className="text-3xl font-bold tabular-nums text-ink">{accounts.data?.totalElements}</span>{' '}
            {accounts.data?.totalElements === 1 ? 'account' : 'accounts'}
          </p>
          <Link to="/transfer" className={linkButton.primary}>
            New transfer <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>

      <Section title="Accounts" aside={<Link to="/accounts" className={linkButton.quiet}>Manage</Link>}>
        <ul className="border-t border-ink">
          {list.map((a) => (
            <li key={a.id} className="border-b border-rule">
              <Link
                to={`/history?account=${encodeURIComponent(a.id)}`}
                className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 text-ink no-underline md:grid-cols-12"
                aria-label={`${a.id}, balance ${formatMoney(a.balance)}. View history`}
              >
                <span className="text-xl font-bold group-hover:text-accent md:col-span-5">{a.id}</span>
                <span className="order-3 text-sm text-muted md:order-none md:col-span-3">Opened {formatDate(a.createdAt)}</span>
                <span className="text-right text-2xl font-bold tabular-nums tracking-[-0.02em] md:col-span-4">
                  {formatMoney(a.balance)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent activity" aside={<Link to="/history" className={linkButton.quiet}>All history</Link>}>
        {activity.isLoading ? (
          <LoadingLine />
        ) : activity.error ? (
          <Notice tone="error" title="Couldn’t load activity">{activity.error.message}</Notice>
        ) : activity.items.length === 0 ? (
          <p className="border-t border-rule py-4 text-muted">No money has moved yet.</p>
        ) : (
          <MovementTable items={activity.items} caption="Latest movements across all accounts" />
        )}
      </Section>
    </div>
  )
}
