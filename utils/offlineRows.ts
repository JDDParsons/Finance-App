export type OfflineRowKind = 'expense' | 'income' | 'transfer'

export function buildOptimisticRow(
  kind: OfflineRowKind,
  id: string,
  userId: string,
  payload: Record<string, any>,
  error: string | null = null
) {
  return {
    id,
    client_operation_id: id,
    created_at: new Date().toISOString(),
    user_id: userId,
    amount: payload.amount,
    date: payload.date,
    entity: kind === 'transfer' ? null : payload.entity,
    notes: kind === 'transfer' ? null : (payload.notes ?? null),
    type: kind === 'expense' ? 'Expense' : kind === 'income' ? 'Income' : 'Transfer',
    budget_id: kind === 'transfer' ? null : (payload.budgetId ?? null),
    account_id: kind === 'transfer' ? payload.fromAccountId : (payload.accountId ?? null),
    destination_account_id: kind === 'transfer' ? payload.toAccountId : null,
    pending_sync: !error,
    sync_error: error,
  }
}
