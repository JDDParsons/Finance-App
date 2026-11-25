export interface SavingsTotal {
  year: number
  month: number
  income: number
  expenses: number
}

import type { Tag } from '../../utils/tags'

export interface FinanceBootstrapData {
  selectedMonth: { year: number; month: number }
  availableMonths: Array<{ year: number; month: number }>
  budgets: any[]
  incomeBudgets: any[]
  budgetHits: any[]
  prevMonthBudgetHits: any[]
  income: any[]
  transfers: any[]
  userProfiles: Record<string, { firstName: string | null; avatarLink: string | null }>
  budgetEntities: Record<string, string[]>
  /** The household's tags. Missing in snapshots saved before tags existed. */
  tags?: Tag[]
}

export interface BootstrapResponse {
  schemaVersion: 1
  userId: string
  syncedAt: string
  profile: any
  accounts: any[]
  finance: FinanceBootstrapData
  savings: SavingsTotal[]
}

export interface OfflineFinanceSnapshot extends BootstrapResponse {
  cacheVersion: 1
}
