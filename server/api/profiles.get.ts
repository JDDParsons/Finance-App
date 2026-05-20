export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const query = getQuery(event)

  const userIdsParam = String(query.userIds ?? '')
  const userIds = userIdsParam ? userIdsParam.split(',').map(id => id.trim()).filter(Boolean) : []

  return getUserProfiles(supabase, userIds)
})
