export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const budgetId = getRouterParam(event, 'budgetId')!
  return getBudgetHitsByBudgetId(supabase, budgetId)
})
