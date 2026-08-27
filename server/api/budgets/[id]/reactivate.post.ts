export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  await reactivateBudget(supabase, id)
  return { success: true }
})
