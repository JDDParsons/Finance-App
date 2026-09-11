export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)

  const { operationId, budgetId, date, amount, entity, accountId, notes } = body
  return createBudgetHitIdempotent(supabase, {
    operationId: requireOperationId(operationId),
    type: 'Expense',
    budgetId: budgetId ?? null,
    date,
    amount,
    entity,
    accountId: accountId ?? null,
    notes: notes ?? null,
  })
})
