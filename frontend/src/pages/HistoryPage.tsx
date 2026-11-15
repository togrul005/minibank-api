import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAllAccounts, useHistory } from '../api/queries'
import type { TransferType } from '../api/types'
import { BigAmount, LoadingLine, Notice, PageTitle, Pagination, Section, Select, linkButton } from '../components/ui'
import { MovementTable } from '../components/MovementTable'
import { formatMoney } from '../lib/money'

const filters: { value: TransferType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'TRANSFER', label: 'Transfers' },
  { value: 'DEPOSIT', label: 'Deposits' },
  { value: 'WITHDRAWAL', label: 'Withdrawals' },
]
const SIZES = [20, 50, 100]

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const accounts = useAllAccounts()
  const list = accounts.data?.content ?? []

  const accountId = params.get('account') ?? undefined
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const size = SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 20
  const filter = (params.get('type') ?? 'ALL') as TransferType | 'ALL'

  // No account in the URL yet: pick the first one, without adding a history entry.
  useEffect(() => {
    if (!accountId && list.length > 0) {
      setParams((p) => { p.set('account', list[0].id); return p }, { replace: true })
    }
  }, [accountId, list, setParams])

  const history = useHistory(accountId, page, size)
  const account = list.find((a) => a.id === accountId)

  const update = (changes: Record<string, string | null>) =>
    setParams((p) => {
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) p.delete(k)
        else p.set(k, v)
      }
      return p
    })

  if (accounts.isLoading) return <LoadingLine>Loading accounts…</LoadingLine>
  if (accounts.error) return <Notice tone="error" title="Couldn’t load accounts">{accounts.error.message}</Notice>
  if (list.length === 0) {
    return (
      <>
        <PageTitle lead="There is no history until an account exists.">History</PageTitle>
        <Link to="/accounts" className={linkButton.primary}>Open an account</Link>
      </>
    )
  }

  const rows = (history.data?.content ?? []).filter((t) => filter === 'ALL' || t.type === filter)

  return (
    <>
      <PageTitle lead="Every transfer, deposit and withdrawal, newest first.">History</PageTitle>

      <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-4">
          <label htmlFor="account" className="mb-2 block text-sm font-bold">Account</label>
          <Select
            id="account"
            value={accountId ?? ''}
            onChange={(e) => update({ account: e.target.value, page: null })}
          >
            {list.map((a) => <option key={a.id} value={a.id}>{a.id}</option>)}
          </Select>
        </div>
        {account ? (
          <div className="md:col-span-8 md:text-right">
            <p className="text-sm font-bold uppercase tracking-[0.08em]">Balance</p>
            <p className="mt-2" aria-label={`Balance ${formatMoney(account.balance)}`}>
              <BigAmount value={account.balance} size="lg" />
            </p>
          </div>
        ) : null}
      </div>

      <Section
        title={accountId ? `Movements · ${accountId}` : 'Movements'}
        aside={history.data ? <span className="tabular-nums">{history.data.totalElements} total</span> : null}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label="Filter this page by type" className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const on = f.value === filter
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ type: f.value === 'ALL' ? null : f.value })}
                  className={`min-h-11 border px-4 text-sm font-bold transition-colors duration-200 ${
                    on ? 'border-accent bg-accent text-white' : 'border-ink bg-paper text-ink hover:bg-neutral'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="size" className="text-muted">Rows per page</label>
            <Select id="size" value={size} className="!min-h-11 !w-auto"
              onChange={(e) => update({ size: e.target.value, page: null })}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {history.isLoading ? (
          <LoadingLine />
        ) : history.error ? (
          <Notice tone="error" title="Couldn’t load history">{history.error.message}</Notice>
        ) : rows.length === 0 ? (
          <p className="border-t border-rule py-4 text-muted">
            {filter === 'ALL' ? 'No money has moved in this account yet.' : 'Nothing of this type on this page.'}
          </p>
        ) : (
          <MovementTable items={rows} accountId={accountId} showId caption={`Movements of ${accountId}`} />
        )}

        {history.data ? (
          <Pagination
            label="History pages"
            page={history.data.page}
            totalPages={history.data.totalPages}
            totalElements={history.data.totalElements}
            onPage={(p) => update({ page: p === 0 ? null : String(p) })}
          />
        ) : null}
      </Section>
    </>
  )
}
