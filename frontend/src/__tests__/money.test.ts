import { formatMoney, parseAmount, splitMoney } from '../lib/money'

describe('parseAmount', () => {
  it('accepts positive amounts with up to 2 decimals', () => {
    expect(parseAmount('12')).toEqual({ ok: true, value: 12 })
    expect(parseAmount('12.5')).toEqual({ ok: true, value: 12.5 })
    expect(parseAmount(' 0,99 ')).toEqual({ ok: true, value: 0.99 })
  })

  it('rejects what the backend would reject', () => {
    expect(parseAmount('').ok).toBe(false)
    expect(parseAmount('0').ok).toBe(false)
    expect(parseAmount('-5').ok).toBe(false)
    expect(parseAmount('1.001').ok).toBe(false)
    expect(parseAmount('abc').ok).toBe(false)
  })
})

describe('money formatting', () => {
  it('formats euros', () => {
    expect(formatMoney(12480.5)).toBe('€12,480.50')
  })

  it('splits whole and cents for the large figure', () => {
    expect(splitMoney(12480.5)).toEqual({ whole: '€12,480', cents: '.50' })
  })
})
