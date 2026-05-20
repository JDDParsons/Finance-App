export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)

  if (query.year && query.month) {
    const year = parseInt(String(query.year))
    const month = parseInt(String(query.month))
    if (isNaN(year) || isNaN(month)) {
      throw createError({ statusCode: 400, message: 'Invalid year or month' })
    }
    return getTransactionsByMonth(supabase, year, month)
  }

  return getAllTransactionsSorted(supabase)
})
