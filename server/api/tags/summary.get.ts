// Every tag with how many expenses carry it, for the Settings page.
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  return listTags(supabase)
})
