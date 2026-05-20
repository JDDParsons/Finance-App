export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  return getIncome(supabase, householdId)
})
