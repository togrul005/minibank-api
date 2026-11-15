// Mirrors the backend DTOs in com.toghrulaliyev.minibank.dto

export interface Account {
  id: string
  balance: number
  createdAt: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type TransferType = 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL'

export interface TransferDetails {
  id: string
  type: TransferType
  fromId: string | null
  toId: string | null
  amount: number
  createdAt: string
}

export interface TransferResult {
  transferId: string
  fromId: string
  toId: string
  amount: number
  fromBalanceAfter: number
  toBalanceAfter: number
}

export interface OperationResult {
  transferId: string
  accountId: string
  amount: number
  balanceAfter: number
}
