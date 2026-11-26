export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  await deleteTag(supabase, id)
  return { success: true }
})
