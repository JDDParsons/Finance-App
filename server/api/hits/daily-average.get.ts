export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)
  const year = Number.parseInt(String(query.year), 10)
  const month = Number.parseInt(String(query.month), 10)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'valid year and month query params are required' })
  }

  return getDailySpendingAverage(supabase, year, month)
})
