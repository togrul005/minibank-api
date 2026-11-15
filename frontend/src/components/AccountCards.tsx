import { Link } from 'react-router'
import { ArrowUpRight, Wallet } from 'lucide-react'
import type { Account } from '../api/types'
import { formatDate, formatMoney } from '../lib/money'

/** Accounts as swipeable payment-style cards. Each card links to that account's history. */
export function AccountCards({ accounts }: { accounts: Account[] }) {
  return (
    <ul className="acct-cards stagger -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3" aria-label="Accounts">
      {accounts.map((a, i) => (
        <li key={a.id} className="snap-start">
          <Link
            to={`/history?account=${encodeURIComponent(a.id)}`}
            className={`acct-card acct-card-${i % 3} group flex h-48 w-72 flex-col justify-between rounded-box p-6 no-underline`}
            aria-label={`${a.id}, balance ${formatMoney(a.balance)}. View history`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-display text-lg font-bold">{a.id}</span>
              <Wallet aria-hidden="true" className="size-6 opacity-80" />
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.1em] opacity-80">Balance</span>
              <span className="font-display block text-3xl font-bold tabular-nums tracking-[-0.02em]">
                {formatMoney(a.balance)}
              </span>
            </span>
            <span className="acct-card-foot flex items-center justify-between text-sm opacity-85">
              <span>Opened {formatDate(a.createdAt)}</span>
              <ArrowUpRight aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
