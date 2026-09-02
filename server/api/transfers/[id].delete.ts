import { deleteTransfer } from '../../utils/supabase/hits'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  await deleteTransfer(supabase, id)
  return { success: true }
})
