import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import type { TransferDetails } from '../api/types'
import { formatDateTime, formatMoney } from '../lib/money'
import { direction } from './MovementTable'

const typeLabel = { TRANSFER: 'Transfer', DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal' } as const

function title(t: TransferDetails) {
  if (t.type === 'DEPOSIT') return `Deposit into ${t.toId}`
  if (t.type === 'WITHDRAWAL') return `Withdrawal from ${t.fromId}`
  return `${t.fromId} → ${t.toId}`
}

/** Compact, app-style list of movements: round icon, what happened, when, and the amount. */
export function ActivityList({ items, label }: { items: TransferDetails[]; label: string }) {
  return (
    <ul className="activity-list stagger flex flex-col" aria-label={label}>
      {items.map((t) => {
        const dir = direction(t)
        const Icon = dir === 'in' ? ArrowDownLeft : dir === 'out' ? ArrowUpRight : ArrowLeftRight
        const sign = dir === 'in' ? '+' : dir === 'out' ? '−' : ''
        return (
          <li key={t.id} className="activity-row flex items-center gap-4 border-b border-rule py-4 last:border-b-0">
            <span aria-hidden="true" className={`activity-icon activity-${dir} flex size-11 shrink-0 items-center justify-center rounded-full`}>
              <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{title(t)}</span>
              <span className="block text-sm text-muted">
                {typeLabel[t.type]} · <span className="tabular-nums">{formatDateTime(t.createdAt)}</span>
              </span>
            </span>
            <span
              className={`whitespace-nowrap text-right font-bold tabular-nums ${dir === 'in' ? 'text-positive' : dir === 'out' ? 'text-negative' : 'text-ink'}`}
            >
              <span className="sr-only">{dir === 'in' ? 'Incoming ' : dir === 'out' ? 'Outgoing ' : 'Between accounts '}</span>
              {sign}
              {formatMoney(t.amount)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
