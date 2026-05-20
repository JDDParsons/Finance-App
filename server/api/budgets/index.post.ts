export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const body = await readBody(event)

  const { name, amount, color, icon } = body
  return createBudget(supabase, user.id, householdId, name, amount, color, icon)
})
