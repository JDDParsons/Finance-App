export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const householdId = await resolveHouseholdId(supabase, user.id)
  const body = await readBody(event)

  return updateAccountBaseline(supabase, user.id, householdId, id, body.baselineAmount)
})
