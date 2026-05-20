export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  return getAccounts(supabase)
})
