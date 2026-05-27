export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)
  const budgetId = String(query.budgetId ?? '').trim()
  const budgetIds = String(query.budgetIds ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  const requestedBudgetIds = budgetIds.length ? budgetIds : budgetId ? [budgetId] : []
  if (!requestedBudgetIds.length) {
    throw createError({ statusCode: 400, message: 'budgetId or budgetIds query param is required' })
  }

  return getDistinctEntitiesByBudgets(supabase, requestedBudgetIds)
})
