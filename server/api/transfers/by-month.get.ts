import { getTransfersByMonth } from '../../utils/supabase/hits'

export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const query = getQuery(event)
  const year = Number(query.year)
  const month = Number(query.month)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid month.' })
  }

  return getTransfersByMonth(supabase, householdId, year, month)
})
