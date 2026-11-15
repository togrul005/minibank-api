/** Display currency. The backend stores plain amounts; change this one constant to switch. */
export const CURRENCY = 'EUR'
const LOCALE = 'en-IE'

const fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

export function formatMoney(value: number): string {
  return fmt.format(value)
}

/** Splits €12,480.50 into { whole: "€12,480", cents: ".50" } for the large-figure display. */
export function splitMoney(value: number): { whole: string; cents: string } {
  const parts = fmt.formatToParts(value)
  let whole = ''
  let cents = ''
  let afterDecimal = false
  for (const p of parts) {
    if (p.type === 'decimal') {
      afterDecimal = true
      cents += p.value
    } else if (afterDecimal && p.type === 'fraction') {
      cents += p.value
    } else {
      whole += p.value
    }
  }
  return { whole, cents }
}

export type AmountCheck = { ok: true; value: number } | { ok: false; error: string }

/** Validates user input the same way the backend does: > 0 and at most 2 decimals. */
export function parseAmount(input: string): AmountCheck {
  const s = input.trim().replace(',', '.')
  if (s === '') return { ok: false, error: 'Enter an amount.' }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, error: 'Use numbers only, with at most 2 decimals.' }
  const value = Number(s)
  if (value <= 0) return { ok: false, error: 'Amount must be more than 0.' }
  if (value >= 1e17) return { ok: false, error: 'Amount is too large.' }
  return { ok: true, value }
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}
