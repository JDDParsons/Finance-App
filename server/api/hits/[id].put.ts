export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { budgetId, date, amount, note, accountId } = body
  return updateBudgetHit(supabase, id, budgetId ?? null, date, amount, note, accountId ?? null)
})
