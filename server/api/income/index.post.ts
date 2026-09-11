export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)

  const { operationId, amount, date, entity, budgetId, accountId, notes } = body
  return createBudgetHitIdempotent(supabase, {
    operationId: requireOperationId(operationId),
    type: 'Income',
    amount,
    date,
    entity,
    budgetId: budgetId ?? null,
    accountId: accountId ?? null,
    notes: notes ?? null,
  })
})
