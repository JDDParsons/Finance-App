export type OfflineRowKind = 'expense' | 'income' | 'transfer'

/**
 * The row shown for a queued edit: the existing row with the edited fields
 * applied. It keeps the original id, creation time and author.
 */
export function buildOptimisticEdit(
  kind: OfflineRowKind,
  existing: Record<string, any> | undefined,
  userId: string,
  targetId: string,
  payload: Record<string, any>
) {
  const edited = buildOptimisticRow(kind, targetId, userId, payload)
  return {
    ...edited,
    client_operation_id: existing?.client_operation_id ?? edited.client_operation_id,
    created_at: existing?.created_at ?? edited.created_at,
    user_id: existing?.user_id ?? edited.user_id,
    // An edit that leaves tags out keeps the tags the row already has.
    ...(kind === 'expense' ? { tags: payload.tags === undefined ? (existing?.tags ?? []) : payload.tags } : {}),
    // An edit that leaves notes out keeps the notes the row already has.
    notes: kind === 'transfer' ? null : (payload.notes === undefined ? (existing?.notes ?? null) : payload.notes),
    pending_sync: true,
    sync_error: null,
  }
}

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
    // Expenses carry the names of their tags.
    ...(kind === 'expense' ? { tags: payload.tags ?? [] } : {}),
    pending_sync: !error,
    sync_error: error,
  }
}
