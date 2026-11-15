import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { TransferDetails } from './types'

export const keys = {
  accounts: ['accounts'] as const,
  accountsPage: (page: number, size: number) => ['accounts', 'page', page, size] as const,
  history: (id: string, page: number, size: number) => ['history', id, page, size] as const,
  health: ['health'] as const,
}

/** Every account (up to 200) - for totals, pickers and the overview. */
export function useAllAccounts() {
  return useQuery({ queryKey: keys.accountsPage(0, 200), queryFn: () => api.listAccounts(0, 200) })
}

export function useAccountsPage(page: number, size: number) {
  return useQuery({
    queryKey: keys.accountsPage(page, size),
    queryFn: () => api.listAccounts(page, size),
    placeholderData: (prev) => prev,
  })
}

export function useHistory(id: string | undefined, page: number, size: number) {
  return useQuery({
    queryKey: keys.history(id ?? '', page, size),
    queryFn: () => api.history(id!, page, size),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  })
}

/** Latest movements across several accounts, de-duplicated (a transfer shows up on both sides). */
export function useRecentActivity(accountIds: string[], limit = 8) {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: keys.history(id, 0, limit),
      queryFn: () => api.history(id, 0, limit),
    })),
  })
  const seen = new Map<string, TransferDetails>()
  for (const r of results) for (const t of r.data?.content ?? []) seen.set(t.id, t)
  const items = [...seen.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
  return {
    items,
    isLoading: results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error ?? null,
  }
}

export function useHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: api.health,
    refetchInterval: 15_000,
    retry: false,
  })
}

function useInvalidateMoney() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: keys.accounts })
    qc.invalidateQueries({ queryKey: ['history'] })
  }
}

export function useCreateAccount() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (v: { id: string; initialBalance: number }) => api.createAccount(v.id, v.initialBalance),
    onSuccess: invalidate,
  })
}

export function useDeposit() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (v: { id: string; amount: number }) => api.deposit(v.id, v.amount),
    onSuccess: invalidate,
  })
}

export function useWithdraw() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (v: { id: string; amount: number }) => api.withdraw(v.id, v.amount),
    onSuccess: invalidate,
  })
}

export function useTransfer() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (v: { fromId: string; toId: string; amount: number; key: string }) =>
      api.transfer(v.fromId, v.toId, v.amount, v.key),
    onSuccess: invalidate,
  })
}
