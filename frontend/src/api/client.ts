import type {
  Account,
  OperationResult,
  Page,
  TransferDetails,
  TransferResult,
} from './types'

/** Error with the backend's error code and message (see ApiExceptionHandler). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach the MiniBank API. Is the backend running?')
  }

  if (!res.ok) {
    let body: { code?: string; message?: string } | undefined
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    throw new ApiError(
      res.status,
      body?.code ?? `HTTP_${res.status}`,
      body?.message ?? (res.statusText || 'Request failed'),
    )
  }
  return res.json() as Promise<T>
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  listAccounts: (page = 0, size = 20) =>
    request<Page<Account>>(`/api/v1/accounts?page=${page}&size=${size}`),

  getAccount: (id: string) =>
    request<Account>(`/api/v1/accounts/${encodeURIComponent(id)}`),

  createAccount: (id: string, initialBalance: number) =>
    request<Account>('/api/v1/accounts', {
      method: 'POST',
      body: json({ id, initialBalance }),
    }),

  deposit: (id: string, amount: number) =>
    request<OperationResult>(`/api/v1/accounts/${encodeURIComponent(id)}/deposit`, {
      method: 'POST',
      body: json({ amount }),
    }),

  withdraw: (id: string, amount: number) =>
    request<OperationResult>(`/api/v1/accounts/${encodeURIComponent(id)}/withdraw`, {
      method: 'POST',
      body: json({ amount }),
    }),

  history: (id: string, page = 0, size = 20) =>
    request<Page<TransferDetails>>(
      `/api/v1/accounts/${encodeURIComponent(id)}/transfers?page=${page}&size=${size}`,
    ),

  /** idempotencyKey: reuse the same key when retrying, so money moves only once. */
  transfer: (fromId: string, toId: string, amount: number, idempotencyKey: string) =>
    request<TransferResult>('/api/v1/transfers', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: json({ fromId, toId, amount }),
    }),

  health: () => request<{ status: string }>('/actuator/health'),
}
