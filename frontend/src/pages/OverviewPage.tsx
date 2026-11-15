import { Link } from 'react-router'
import { useAllAccounts, useRecentActivity } from '../api/queries'
import { BigAmount, LoadingLine, Notice, Section, linkButton } from '../components/ui'
import { AccountCards } from '../components/AccountCards'
import { ActivityList } from '../components/ActivityList'
import { QuickActions } from '../components/QuickActions'

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function OverviewPage() {
  const accounts = useAllAccounts()
  const list = accounts.data?.content ?? []
  const total = list.reduce((sum, a) => sum + a.balance, 0)
  const count = accounts.data?.totalElements ?? 0
  const activity = useRecentActivity(list.slice(0, 10).map((a) => a.id), 6)

  if (accounts.isLoading) return <LoadingLine>Loading accounts…</LoadingLine>
  if (accounts.error) return <Notice tone="error" title="Couldn’t load accounts">{accounts.error.message}</Notice>

  if (list.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-5xl font-bold leading-none tracking-[-0.03em] md:text-7xl">No accounts yet</h1>
        <p className="mt-4 text-lg text-muted">Open your first account to start moving money.</p>
        <Link to="/accounts" className={`${linkButton.primary} mt-8`}>Open an account</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <div className="hero-surface flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.08em]">Total balance</p>
          <h1 className="mt-3">
            <span className="sr-only">Total balance </span>
            <BigAmount value={total} size="xl" />
          </h1>
          <p className="mt-4 text-muted">
            Across <span className="font-bold tabular-nums text-ink">{count}</span> {count === 1 ? 'account' : 'accounts'}
          </p>
        </div>
        <div className="md:min-w-[360px]">
          <QuickActions accountId={list[0]?.id} />
        </div>
      </div>

      <Section title="Your accounts" aside={<Link to="/accounts" className={linkButton.quiet}>Manage</Link>}>
        <AccountCards accounts={list} />
      </Section>

      <Section title="Recent activity" aside={<Link to="/history" className={linkButton.quiet}>See all</Link>}>
        {activity.isLoading ? (
          <LoadingLine />
        ) : activity.error ? (
          <Notice tone="error" title="Couldn’t load activity">{activity.error.message}</Notice>
        ) : activity.items.length === 0 ? (
          <p className="border-t border-rule py-4 text-muted">No money has moved yet.</p>
        ) : (
          <ActivityList items={activity.items} label="Latest movements across all accounts" />
        )}
      </Section>
    </div>
  )
}
