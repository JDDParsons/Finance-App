export type BudgetType = 'Expense' | 'Income'

export function parseBudgetType(value: unknown): BudgetType {
  if (value === undefined || value === null || value === '') return 'Expense'
  if (value === 'Expense' || value === 'Income') return value
  throw createError({ statusCode: 400, statusMessage: 'Budget type must be Expense or Income.' })
}
