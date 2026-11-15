import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatMoney, splitMoney } from '../lib/money'

/**
 * Signature move: large balances are set as one typographic figure, with the cents
 * raised and reduced, so the whole number reads first.
 */
export function BigAmount({ value, size = 'lg', className = '' }: {
  value: number
  size?: 'md' | 'lg' | 'xl'
  className?: string
}) {
  const shown = useCountUp(value)
  const { whole, cents } = splitMoney(shown)
  const sizes = {
    md: 'text-3xl',
    lg: 'text-5xl md:text-6xl',
    xl: 'text-6xl md:text-8xl',
  }
  return (
    <span className={`amount-figure font-display inline-flex items-start font-bold leading-none tracking-[-0.04em] tabular-nums ${sizes[size]} ${className}`}>
      <span className="sr-only">{formatMoney(value)}</span>
      <span aria-hidden="true">{whole}</span>
      <span aria-hidden="true" className="ml-[0.06em] text-[0.42em] leading-[1.25] tracking-normal">{cents}</span>
    </span>
  )
}

/** Counts up from the previous value to the new one (skipped for reduced motion). */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target)
  const from = useRef(0)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof requestAnimationFrame === 'undefined') {
      setValue(target)
      from.current = target
      return
    }
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round((begin + (target - begin) * eased) * 100) / 100)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

/** Section header: a heavy rule, the label on the left, an optional count or action on the right. */
export function Section({ title, aside, children, id }: {
  title: string
  aside?: ReactNode
  children: ReactNode
  id?: string
}) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className="section-surface">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="section-title text-sm font-bold uppercase tracking-[0.08em]">{title}</h2>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  const chars = typeof children === 'string' ? children.length : 0
  return (
    <header className="mb-12 md:mb-16">
      <h1 className="font-display text-5xl font-bold leading-none tracking-[-0.03em] md:text-7xl">
        {chars ? <span className="typewriter" style={{ ['--chars' as string]: chars }}>{children}</span> : children}
      </h1>
      {lead ? <p className="mt-4 max-w-xl text-lg text-muted">{lead}</p> : null}
    </header>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'btn-primary rounded-control bg-accent text-on-accent hover:bg-accent-ink disabled:bg-muted',
    secondary: 'rounded-control border border-line bg-transparent text-ink hover:bg-neutral disabled:text-muted disabled:border-rule',
    quiet: 'text-accent underline-offset-4 hover:underline disabled:text-muted',
  }
  const pad = variant === 'quiet' ? 'min-h-11 px-1' : 'min-h-11 px-5'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-[15px] font-bold transition-colors duration-200 active:scale-[0.98] ${pad} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({ label, help, error, children }: {
  label: string
  help?: string
  error?: string
  children: (ids: { inputId: string; describedBy?: string; invalid: boolean }) => ReactNode
}) {
  const inputId = useId()
  const helpId = useId()
  const errorId = useId()
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-bold">{label}</label>
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {help && !error ? <p id={helpId} className="text-sm text-muted">{help}</p> : null}
      {error ? <p id={errorId} className="text-sm font-bold text-danger">{error}</p> : null}
    </div>
  )
}

const control = 'min-h-12 w-full rounded-control border bg-surface px-3 text-base text-ink placeholder:text-muted transition-colors duration-200'

export function TextInput({ invalid, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`${control} ${invalid ? 'border-danger' : 'border-line'} ${className}`} aria-invalid={invalid || undefined} {...props} />
}

export function MoneyInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <div className={`flex min-h-12 overflow-hidden rounded-control border bg-surface ${invalid ? 'border-danger' : 'border-line'}`}>
      <span aria-hidden="true" className="flex items-center border-r border-rule px-3 text-muted">€</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent px-3 text-base tabular-nums text-ink placeholder:text-muted"
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  )
}

export function Select({ invalid, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={`${control} ${invalid ? 'border-danger' : 'border-line'} ${className}`} {...props} />
}

export function Notice({ tone, title, children }: { tone: 'error' | 'success'; title: string; children?: ReactNode }) {
  const isError = tone === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`page-enter flex gap-3 rounded-control border-l-4 py-3 pl-4 pr-3 ${isError ? 'border-danger bg-neutral' : 'border-positive bg-neutral'}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${isError ? 'text-danger' : 'text-positive'}`} />
      <div>
        <p className="font-bold">{title}</p>
        {children ? <div className="text-sm text-muted">{children}</div> : null}
      </div>
    </div>
  )
}

export function Pagination({ page, totalPages, totalElements, onPage, label }: {
  page: number
  totalPages: number
  totalElements: number
  onPage: (p: number) => void
  label: string
}) {
  if (totalElements === 0) return null
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
      <span className="text-muted tabular-nums">
        Page {page + 1} of {Math.max(totalPages, 1)} · {totalElements} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  )
}

export function LoadingLine({ children = 'Loading…' }: { children?: ReactNode }) {
  return <p className="border-t border-rule py-4 text-muted" aria-live="polite">{children}</p>
}

/** Class strings for router <Link>s that look like buttons. */
export const linkButton = {
  primary: 'btn-primary rounded-control inline-flex min-h-11 items-center justify-center gap-2 bg-accent px-5 text-[15px] font-bold text-on-accent no-underline transition-colors duration-200 hover:bg-accent-ink',
  secondary: 'rounded-control inline-flex min-h-11 items-center justify-center gap-2 border border-line px-5 text-[15px] font-bold text-ink no-underline transition-colors duration-200 hover:bg-neutral',
  quiet: 'font-bold text-accent underline-offset-4 hover:underline',
}
