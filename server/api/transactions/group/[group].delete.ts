export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const group = getRouterParam(event, 'group')!
  await deleteTransactionsByGroup(supabase, group)
  return { success: true }
})
