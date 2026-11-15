import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, ChevronDown, Delete, Wallet } from 'lucide-react'
import { useAllAccounts, useTransfer } from '../api/queries'
import { ApiError } from '../api/client'
import type { TransferResult } from '../api/types'
import { BigAmount, Button, LoadingLine, Notice, PageTitle, linkButton } from '../components/ui'
import { formatMoney, parseAmount } from '../lib/money'

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function SuccessView({ result, onAgain }: { result: TransferResult; onAgain: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-positive">Sent</p>
        <p className="mt-4"><BigAmount value={result.amount} size="xl" /></p>
        <p className="mt-4 text-xl">
          {result.fromId} <ArrowRight aria-label="to" className="inline size-5 align-[-3px]" /> {result.toId}
        </p>
      </div>
      <dl className="grid max-w-xl grid-cols-2 border-t border-line text-[15px]">
        <dt className="border-b border-rule py-3 text-muted">{result.fromId} now</dt>
        <dd className="border-b border-rule py-3 text-right font-bold tabular-nums">{formatMoney(result.fromBalanceAfter)}</dd>
        <dt className="border-b border-rule py-3 text-muted">{result.toId} now</dt>
        <dd className="border-b border-rule py-3 text-right font-bold tabular-nums">{formatMoney(result.toBalanceAfter)}</dd>
        <dt className="border-b border-rule py-3 text-muted">Reference</dt>
        <dd className="border-b border-rule py-3 text-right font-mono text-sm" title={result.transferId}>{result.transferId.slice(0, 8)}</dd>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onAgain}>New transfer</Button>
        <Link to={`/history?account=${encodeURIComponent(result.fromId)}`} className={linkButton.secondary}>View history</Link>
      </div>
    </div>
  )
}

export function TransferPage() {
  const [params] = useSearchParams()
  const accounts = useAllAccounts()
  const transfer = useTransfer()
  const list = accounts.data?.content ?? []

  const [fromId, setFromId] = useState(params.get('from') ?? '')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ from?: string; to?: string; amount?: string }>({})
  const [result, setResult] = useState<TransferResult | null>(null)

  // One key per attempt: a retry of the same request reuses it, so the backend moves money once.
  const key = useRef(newKey())
  const changed = () => { key.current = newKey() }

  const from = list.find((a) => a.id === fromId)
  const parsed = parseAmount(amount)
  const after = from && parsed.ok ? from.balance - parsed.value : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!fromId) next.from = 'Choose the account to send from.'
    if (!toId) next.to = 'Choose the account to send to.'
    else if (toId === fromId) next.to = 'Pick a different account.'
    if (!parsed.ok) next.amount = parsed.error
    else if (from && parsed.value > from.balance) next.amount = `${fromId} has only ${formatMoney(from.balance)}.`
    setErrors(next)
    if (Object.keys(next).length > 0 || !parsed.ok) return

    transfer.mutate(
      { fromId, toId, amount: parsed.value, key: key.current },
      { onSuccess: (r) => { setResult(r); key.current = newKey() } },
    )
  }

  function again() {
    setResult(null)
    setAmount('')
    setToId('')
    transfer.reset()
  }

  if (accounts.isLoading) return <LoadingLine>Loading accounts…</LoadingLine>
  if (accounts.error) return <Notice tone="error" title="Couldn’t load accounts">{accounts.error.message}</Notice>
  if (list.length < 2) {
    return (
      <>
        <PageTitle lead="You need at least two accounts to move money between them.">Transfer</PageTitle>
        <Link to="/accounts" className={linkButton.primary}>Open an account</Link>
      </>
    )
  }

  if (result) {
    return <SuccessView result={result} onAgain={again} />
  }

  const apiError = transfer.error instanceof ApiError ? transfer.error : null
  const to = list.find((a) => a.id === toId)

  return (
    <div className="mx-auto flex max-w-[460px] flex-col gap-6">
      <h1 className="font-display text-center text-2xl font-bold">Send money</h1>

      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        {apiError ? (
          <Notice tone="error" title={apiError.status === 422 ? 'Not enough money' : 'Transfer failed'}>
            {apiError.message}
            {apiError.code === 'NETWORK' ? ' You can press Send again safely.' : null}
          </Notice>
        ) : null}

        {/* From / To: one card, two rows */}
        <div className="send-card rounded-box bg-surface p-5">
          <AccountRow label="From" value={fromId} error={errors.from} balance={from?.balance}
            options={list} onChange={(v) => { setFromId(v); changed() }} />
          <div className="my-4 h-px bg-rule" />
          <AccountRow label="To" value={toId} error={errors.to} balance={to?.balance}
            options={list.filter((a) => a.id !== fromId)} onChange={(v) => { setToId(v); changed() }} />
        </div>

        {/* Big amount: a real input (type with the keyboard) plus the keypad below */}
        <div className="flex flex-col items-center gap-2">
          <label htmlFor="amount" className="text-sm text-muted">Amount</label>
          <div className="flex items-baseline justify-center gap-1">
            <span aria-hidden="true" className="font-display text-5xl font-bold text-muted">€</span>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'amount-error' : 'amount-help'}
              onChange={(e) => { setAmount(e.target.value); changed() }}
              style={{ width: `${Math.max(1, amount.length || 1) + 0.6}ch` }}
              className="amount-display font-display min-w-[2ch] max-w-full bg-transparent text-center text-6xl font-bold tabular-nums text-ink caret-accent outline-none placeholder:text-muted"
            />
          </div>
          {errors.amount ? (
            <p id="amount-error" className="text-sm font-bold text-danger">{errors.amount}</p>
          ) : (
            <p id="amount-help" className="text-sm text-muted">
              {after !== null ? <>{fromId} after: <span className="font-bold tabular-nums text-ink">{formatMoney(after)}</span></> : 'At most 2 decimals.'}
            </p>
          )}
        </div>

        <Button type="submit" disabled={transfer.isPending} className="w-full min-h-13 text-base">
          {transfer.isPending ? 'Sending…' : 'Send money'}
        </Button>

        <Keypad value={amount} onChange={(v) => { setAmount(v); changed() }} />

        <p className="text-center text-sm text-muted">
          Safe to retry: each transfer has its own Idempotency-Key, so money moves only once.
        </p>
      </form>
    </div>
  )
}

function AccountRow({ label, value, balance, options, error, onChange }: {
  label: string
  value: string
  balance?: number
  options: { id: string; balance: number }[]
  error?: string
  onChange: (v: string) => void
}) {
  const id = `acct-${label.toLowerCase()}`
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral text-ink">
        <Wallet className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-xs text-muted">{label}</label>
        <select
          id={id}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent text-base font-bold text-ink outline-none"
        >
          <option value="">Choose account</option>
          {options.map((a) => <option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
        {error ? (
          <p id={`${id}-error`} className="text-sm font-bold text-danger">{error}</p>
        ) : (
          <p className="text-sm text-muted tabular-nums">{balance !== undefined ? `Balance: ${formatMoney(balance)}` : 'No account chosen'}</p>
        )}
      </div>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-muted" />
    </div>
  )
}

/** On-screen number pad. Follows the same rules as typing: digits, one decimal point, two decimals. */
function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function press(k: string) {
    if (k === 'back') return onChange(value.slice(0, -1))
    if (k === '.') return onChange(value.includes('.') ? value : (value || '0') + '.')
    const [, dec] = value.split('.')
    if (dec !== undefined && dec.length >= 2) return
    if (value === '0') return onChange(k)
    onChange(value + k)
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']
  return (
    <div className="keypad grid grid-cols-3 gap-2 rounded-box bg-surface p-3" role="group" aria-label="Number pad">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === 'back' ? 'Delete last digit' : k === '.' ? 'Decimal point' : undefined}
          className="key flex min-h-13 items-center justify-center rounded-control bg-neutral text-xl font-bold text-ink transition-colors duration-150 hover:bg-rule active:bg-ink active:text-paper"
        >
          {k === 'back' ? <Delete aria-hidden="true" className="size-6" /> : k}
        </button>
      ))}
    </div>
  )
}
