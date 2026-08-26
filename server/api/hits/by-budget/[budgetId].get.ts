export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const budgetId = getRouterParam(event, 'budgetId')!
  const query = getQuery(event)
  const startDate = query.startDate ? String(query.startDate) : undefined
  const endDate = query.endDate ? String(query.endDate) : undefined
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw createError({ statusCode: 400, message: 'startDate and endDate must be provided together' })
  }
  if (startDate && endDate && (!datePattern.test(startDate) || !datePattern.test(endDate) || startDate >= endDate)) {
    throw createError({ statusCode: 400, message: 'startDate and endDate must define a valid date range' })
  }

  return getBudgetHitsByBudgetId(supabase, budgetId, startDate, endDate)
})
