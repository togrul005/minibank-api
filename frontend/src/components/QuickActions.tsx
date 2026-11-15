import { Link } from 'react-router'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Clock } from 'lucide-react'

/** Round shortcut buttons under the total balance. Deposit / Withdraw open the panel for the given account. */
export function QuickActions({ accountId }: { accountId?: string }) {
  const q = accountId ? `&account=${encodeURIComponent(accountId)}` : ''
  const actions = [
    { to: '/transfer', label: 'Transfer', Icon: ArrowLeftRight, primary: true },
    { to: `/accounts?action=deposit${q}`, label: 'Deposit', Icon: ArrowDownLeft },
    { to: `/accounts?action=withdraw${q}`, label: 'Withdraw', Icon: ArrowUpRight },
    { to: '/history', label: 'History', Icon: Clock },
  ]
  return (
    <ul className="stagger grid grid-cols-4 gap-3 sm:gap-6" aria-label="Quick actions">
      {actions.map(({ to, label, Icon, primary }) => (
        <li key={label}>
          <Link to={to} className="group flex flex-col items-center gap-2 text-sm font-bold text-ink no-underline">
            <span
              className={`quick-action flex size-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-1 group-active:scale-95 ${
                primary ? 'quick-action-primary bg-accent text-on-accent' : 'border border-rule bg-neutral text-ink'
              }`}
            >
              <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
            </span>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
