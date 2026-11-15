import { Fragment, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAccountsPage, useCreateAccount, useDeposit, useWithdraw } from '../api/queries'
import type { Account } from '../api/types'
import {
  Button, Field, LoadingLine, MoneyInput, Notice, PageTitle, Pagination, Section, TextInput, linkButton,
} from '../components/ui'
import { formatDate, formatMoney, parseAmount } from '../lib/money'

const PAGE_SIZE = 20

function OpenAccountForm() {
  const create = useCreateAccount()
  const [id, setId] = useState('')
  const [balance, setBalance] = useState('')
  const [errors, setErrors] = useState<{ id?: string; balance?: string }>({})
  const [opened, setOpened] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    const trimmed = id.trim()
    if (!trimmed) next.id = 'Enter an account ID.'
    else if (trimmed.length > 32) next.id = 'Use 32 characters or fewer.'
    const amount = parseAmount(balance)
    if (!amount.ok) next.balance = amount.error
    setErrors(next)
    if (Object.keys(next).length > 0 || !amount.ok) return

    setOpened(null)
    create.mutate(
      { id: trimmed, initialBalance: amount.value },
      {
        onSuccess: (acc) => {
          setOpened(acc.id)
          setId('')
          setBalance('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {opened ? <Notice tone="success" title={`Account ${opened} opened`} /> : null}
      {create.error ? <Notice tone="error" title="Couldn’t open the account">{create.error.message}</Notice> : null}
      <Field label="Account ID" help="Up to 32 characters. It can’t be changed later." error={errors.id}>
        {({ inputId, describedBy, invalid }) => (
          <TextInput
            id={inputId}
            value={id}
            maxLength={32}
            autoComplete="off"
            onChange={(e) => setId(e.target.value)}
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </Field>
      <Field label="Starting balance" error={errors.balance}>
        {({ inputId, describedBy, invalid }) => (
          <MoneyInput
            id={inputId}
            value={balance}
            placeholder="0.00"
            onChange={(e) => setBalance(e.target.value)}
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </Field>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Opening…' : 'Open account'}
      </Button>
    </form>
  )
}

function MoneyPanel({ account, mode, onClose }: {
  account: Account
  mode: 'deposit' | 'withdraw'
  onClose: () => void
}) {
  const deposit = useDeposit()
  const withdraw = useWithdraw()
  const mutation = mode === 'deposit' ? deposit : withdraw
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [done, setDone] = useState<number | null>(null)

  const parsed = parseAmount(value)
  const preview = parsed.ok
    ? account.balance + (mode === 'deposit' ? parsed.value : -parsed.value)
    : null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(undefined)
    mutation.mutate(
      { id: account.id, amount: parsed.value },
      { onSuccess: (r) => { setDone(r.balanceAfter); setValue('') } },
    )
  }

  const verb = mode === 'deposit' ? 'Deposit' : 'Withdraw'
  return (
    <form onSubmit={submit} noValidate className="page-enter grid gap-5 rounded-box bg-neutral p-5 md:grid-cols-12 md:items-end">
      <div className="md:col-span-12">
        <p className="font-bold">{verb} {mode === 'deposit' ? 'into' : 'from'} {account.id}</p>
      </div>
      <div className="md:col-span-5">
        <Field label="Amount" error={error}>
          {({ inputId, describedBy, invalid }) => (
            <MoneyInput
              id={inputId}
              value={value}
              autoFocus
              placeholder="0.00"
              onChange={(e) => setValue(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>
      </div>
      <p className="text-sm text-muted md:col-span-3 md:pb-3" aria-live="polite">
        {preview !== null ? <>New balance <strong className="tabular-nums text-ink">{formatMoney(preview)}</strong></> : null}
      </p>
      <div className="flex gap-2 md:col-span-4 md:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : `Confirm ${verb.toLowerCase()}`}</Button>
      </div>
      <div className="md:col-span-12" aria-live="polite">
        {mutation.error ? <Notice tone="error" title={`${verb} failed`}>{mutation.error.message}</Notice> : null}
        {done !== null && !mutation.error ? (
          <Notice tone="success" title={`${verb} done`}>New balance {formatMoney(done)}</Notice>
        ) : null}
      </div>
    </form>
  )
}

export function AccountsPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, error } = useAccountsPage(page, PAGE_SIZE)
  // deep link from the Overview quick actions: /accounts?account=main-eur&action=deposit
  const [params] = useSearchParams()
  const linkedAction = params.get('action')
  const linkedAccount = params.get('account')
  const [open, setOpen] = useState<{ id: string; mode: 'deposit' | 'withdraw' } | null>(
    linkedAccount && (linkedAction === 'deposit' || linkedAction === 'withdraw')
      ? { id: linkedAccount, mode: linkedAction }
      : null,
  )

  return (
    <>
      <PageTitle lead="Open accounts, add money, or take it out.">Accounts</PageTitle>
      <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-4">
          <Section title="Open an account">
            <OpenAccountForm />
          </Section>
        </div>
        <div className="min-w-0 md:col-span-8">
          <Section title="All accounts" aside={data ? <span className="tabular-nums">{data.totalElements} total</span> : null}>
            {isLoading ? (
              <LoadingLine />
            ) : error ? (
              <Notice tone="error" title="Couldn’t load accounts">{error.message}</Notice>
            ) : !data || data.content.length === 0 ? (
              <p className="border-t border-rule py-4 text-muted">No accounts yet. Open one with the form.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-[15px]">
                    <caption className="sr-only">All accounts</caption>
                    <thead>
                      <tr className="border-b border-line text-xs font-bold uppercase tracking-[0.08em]">
                        <th scope="col" className="py-3 pr-4">Account</th>
                        <th scope="col" className="py-3 pr-4">Opened</th>
                        <th scope="col" className="py-3 pr-4 text-right">Balance</th>
                        <th scope="col" className="py-3 text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="stagger">
                      {data.content.map((a) => {
                        const isOpen = open?.id === a.id
                        return (
                          <Fragment key={a.id}>
                            <tr className={isOpen ? '' : 'border-b border-rule'}>
                              <td className="py-4 pr-4 text-lg font-bold">{a.id}</td>
                              <td className="whitespace-nowrap py-4 pr-4 text-muted">{formatDate(a.createdAt)}</td>
                              <td className="whitespace-nowrap py-4 pr-4 text-right text-lg font-bold tabular-nums">{formatMoney(a.balance)}</td>
                              <td className="whitespace-nowrap py-2 text-right">
                                <Button variant="quiet" onClick={() => setOpen({ id: a.id, mode: 'deposit' })} aria-label={`Deposit into ${a.id}`}>Deposit</Button>
                                <Button variant="quiet" className="ml-3" onClick={() => setOpen({ id: a.id, mode: 'withdraw' })} aria-label={`Withdraw from ${a.id}`}>Withdraw</Button>
                                <Link to={`/history?account=${encodeURIComponent(a.id)}`} className={`${linkButton.quiet} ml-4 inline-flex min-h-11 items-center px-1`} aria-label={`History of ${a.id}`}>History</Link>
                              </td>
                            </tr>
                            {isOpen ? (
                              <tr className="border-b border-rule">
                                <td colSpan={4} className="pb-4">
                                  <MoneyPanel key={open.mode} account={a} mode={open.mode} onClose={() => setOpen(null)} />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  label="Accounts pages"
                  page={data.page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  onPage={setPage}
                />
              </>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}
