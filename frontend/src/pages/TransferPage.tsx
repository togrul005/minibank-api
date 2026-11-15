import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useAllAccounts, useTransfer } from '../api/queries'
import { ApiError } from '../api/client'
import type { TransferResult } from '../api/types'
import {
  BigAmount, Button, Field, LoadingLine, MoneyInput, Notice, PageTitle, Section, Select, linkButton,
} from '../components/ui'
import { formatMoney, parseAmount } from '../lib/money'

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function SuccessView({ result, onAgain }: { result: TransferResult; onAgain: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Sent</p>
        <p className="mt-4"><BigAmount value={result.amount} size="xl" /></p>
        <p className="mt-4 text-xl">
          {result.fromId} <ArrowRight aria-label="to" className="inline size-5 align-[-3px]" /> {result.toId}
        </p>
      </div>
      <dl className="grid max-w-xl grid-cols-2 border-t border-ink text-[15px]">
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

  return (
    <>
      <PageTitle lead="Move money between your accounts.">Transfer</PageTitle>
      <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-10">
        <form onSubmit={submit} noValidate className="flex flex-col gap-6 md:col-span-7">
          <Section title="Details">
            <div className="flex flex-col gap-6">
              {apiError ? (
                <Notice tone="error" title={apiError.status === 422 ? 'Not enough money' : 'Transfer failed'}>
                  {apiError.message}
                  {apiError.code === 'NETWORK' ? ' You can press Send again safely.' : null}
                </Notice>
              ) : null}
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="From" error={errors.from}>
                  {({ inputId, describedBy, invalid }) => (
                    <Select id={inputId} value={fromId} invalid={invalid} aria-describedby={describedBy}
                      onChange={(e) => { setFromId(e.target.value); changed() }}>
                      <option value="">Choose account</option>
                      {list.map((a) => <option key={a.id} value={a.id}>{a.id} · {formatMoney(a.balance)}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="To" error={errors.to}>
                  {({ inputId, describedBy, invalid }) => (
                    <Select id={inputId} value={toId} invalid={invalid} aria-describedby={describedBy}
                      onChange={(e) => { setToId(e.target.value); changed() }}>
                      <option value="">Choose account</option>
                      {list.filter((a) => a.id !== fromId).map((a) => (
                        <option key={a.id} value={a.id}>{a.id} · {formatMoney(a.balance)}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Amount" help="At most 2 decimals." error={errors.amount}>
                {({ inputId, describedBy, invalid }) => (
                  <MoneyInput id={inputId} value={amount} placeholder="0.00" invalid={invalid} aria-describedby={describedBy}
                    onChange={(e) => { setAmount(e.target.value); changed() }} />
                )}
              </Field>
              <Button type="submit" disabled={transfer.isPending} className="self-start">
                {transfer.isPending ? 'Sending…' : 'Send money'}
              </Button>
            </div>
          </Section>
        </form>

        <aside className="md:col-span-5">
          <Section title="Summary">
            <dl className="grid grid-cols-2 border-t border-ink text-[15px]">
              <dt className="border-b border-rule py-3 text-muted">From</dt>
              <dd className="border-b border-rule py-3 text-right font-bold">{fromId || '—'}</dd>
              <dt className="border-b border-rule py-3 text-muted">To</dt>
              <dd className="border-b border-rule py-3 text-right font-bold">{toId || '—'}</dd>
              <dt className="border-b border-rule py-3 text-muted">Amount</dt>
              <dd className="border-b border-rule py-3 text-right font-bold tabular-nums">{parsed.ok ? formatMoney(parsed.value) : '—'}</dd>
              <dt className="border-b border-rule py-3 text-muted">{fromId ? `${fromId} after` : 'Balance after'}</dt>
              <dd className={`border-b border-rule py-3 text-right font-bold tabular-nums ${after !== null && after < 0 ? 'text-danger' : ''}`}>
                {after !== null ? formatMoney(after) : '—'}
              </dd>
            </dl>
            <p className="mt-6 text-sm text-muted">
              Each transfer carries a unique Idempotency-Key. If the connection drops and you send again,
              the money still moves only once.
            </p>
          </Section>
        </aside>
      </div>
    </>
  )
}
