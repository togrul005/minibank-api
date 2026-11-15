import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../router'

const accounts = {
  content: [
    { id: 'main', balance: 100, createdAt: '2026-11-01T10:00:00Z' },
    { id: 'savings', balance: 50, createdAt: '2026-11-02T10:00:00Z' },
  ],
  page: 0, size: 200, totalElements: 2, totalPages: 1,
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('TransferPage', () => {
  it('blocks sending more than the balance before calling the API', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/actuator') ? respond({ status: 'UP' }) : respond(accounts))
    renderAt('/transfer')
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('From'), 'main')
    await user.selectOptions(screen.getByLabelText('To'), 'savings')
    await user.type(screen.getByLabelText('Amount'), '500')
    await user.click(screen.getByRole('button', { name: 'Send money' }))

    expect(await screen.findByText('main has only €100.00.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/transfers'))).toBe(false)
  })

  it('sends an Idempotency-Key and shows the result', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/actuator')) return respond({ status: 'UP' })
      if (url.endsWith('/api/v1/transfers') && init?.method === 'POST') {
        return respond({ transferId: 'abcdef12-0000', fromId: 'main', toId: 'savings', amount: 25, fromBalanceAfter: 75, toBalanceAfter: 75 })
      }
      return respond(accounts)
    })
    renderAt('/transfer')
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('From'), 'main')
    await user.selectOptions(screen.getByLabelText('To'), 'savings')
    await user.type(screen.getByLabelText('Amount'), '25')
    await user.click(screen.getByRole('button', { name: 'Send money' }))

    expect(await screen.findByText('Sent')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/v1/transfers'))!
    const headers = (call[1] as RequestInit).headers as Record<string, string>
    expect(headers['Idempotency-Key']).toMatch(/.{8,}/)
    await waitFor(() => expect(screen.getByText('abcdef12')).toBeInTheDocument())
  })
})
