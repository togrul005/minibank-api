import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import type { TransferDetails } from '../api/types'
import { formatDateTime, formatMoney } from '../lib/money'

const typeLabel = { TRANSFER: 'Transfer', DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal' } as const
const typeIcon = { TRANSFER: ArrowLeftRight, DEPOSIT: ArrowDownLeft, WITHDRAWAL: ArrowUpRight } as const

/** Direction of a movement, seen from one account (or from the whole bank when none is given). */
export function direction(t: TransferDetails, accountId?: string): 'in' | 'out' | 'internal' {
  if (t.type === 'DEPOSIT') return 'in'
  if (t.type === 'WITHDRAWAL') return 'out'
  if (!accountId) return 'internal'
  return t.toId === accountId ? 'in' : 'out'
}

function details(t: TransferDetails, accountId?: string) {
  if (t.type === 'DEPOSIT') return accountId ? 'Deposit' : `Deposit into ${t.toId}`
  if (t.type === 'WITHDRAWAL') return accountId ? 'Withdrawal' : `Withdrawal from ${t.fromId}`
  if (!accountId) return `${t.fromId} → ${t.toId}`
  return t.toId === accountId ? `From ${t.fromId}` : `To ${t.toId}`
}

export function MovementTable({ items, accountId, showId = false, caption }: {
  items: TransferDetails[]
  accountId?: string
  showId?: boolean
  caption: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs font-bold uppercase tracking-[0.08em]">
            <th scope="col" className="py-3 pr-4">Date</th>
            <th scope="col" className="py-3 pr-4">Type</th>
            <th scope="col" className="py-3 pr-4">Details</th>
            {showId ? <th scope="col" className="py-3 pr-4">Reference</th> : null}
            <th scope="col" className="py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="stagger">
          {items.map((t) => {
            const dir = direction(t, accountId)
            const Icon = typeIcon[t.type]
            const sign = dir === 'in' ? '+' : dir === 'out' ? '−' : ''
            return (
              <tr key={t.id} className="border-b border-rule">
                <td className="whitespace-nowrap py-4 pr-4 tabular-nums text-muted">{formatDateTime(t.createdAt)}</td>
                <td className="py-4 pr-4">
                  <span className="inline-flex items-center gap-2 font-bold">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
                    {typeLabel[t.type]}
                  </span>
                </td>
                <td className="py-4 pr-4">{details(t, accountId)}</td>
                {showId ? (
                  <td className="py-4 pr-4 font-mono text-sm text-muted" title={t.id}>{t.id.slice(0, 8)}</td>
                ) : null}
                <td
                  className={`whitespace-nowrap py-4 text-right font-bold tabular-nums ${dir === 'in' ? 'text-positive' : dir === 'out' ? 'text-negative' : 'text-ink'}`}
                >
                  <span className="sr-only">{dir === 'in' ? 'Incoming ' : dir === 'out' ? 'Outgoing ' : ''}</span>
                  {sign}
                  {formatMoney(t.amount)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
