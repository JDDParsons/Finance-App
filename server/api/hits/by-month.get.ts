export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)

  const year = parseInt(String(query.year))
  const month = parseInt(String(query.month))

  if (isNaN(year) || isNaN(month)) {
    throw createError({ statusCode: 400, message: 'year and month query params are required' })
  }

  return getBudgetHitsByMonth(supabase, year, month)
})
