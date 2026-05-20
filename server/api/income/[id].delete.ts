export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  await deleteIncome(supabase, id)
  return { success: true }
})
