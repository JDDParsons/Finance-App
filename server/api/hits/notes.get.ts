export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)
  const budgetId = String(query.budgetId ?? '')

  if (!budgetId) {
    throw createError({ statusCode: 400, message: 'budgetId query param is required' })
  }

  return getDistinctEntitiesByBudget(supabase, budgetId)
})
