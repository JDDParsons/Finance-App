export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)
  const budgetId = String(query.budgetId ?? '').trim()
  const budgetIds = String(query.budgetIds ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  if (budgetIds.length) {
    return getDistinctEntitiesByBudgets(supabase, budgetIds)
  }

  if (!budgetId) {
    throw createError({ statusCode: 400, message: 'budgetId or budgetIds query param is required' })
  }

  return getDistinctEntitiesByBudget(supabase, budgetId)
})
