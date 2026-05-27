export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { budgetId, date, amount, entity, accountId, notes } = body
  return updateBudgetHit(supabase, id, budgetId ?? null, date, amount, entity, accountId ?? null, notes)
})
