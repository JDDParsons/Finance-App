import { updateTransfer } from '../../utils/supabase/hits'
import { validateTransferInput } from '../../utils/transfer'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!

  try {
    const input = validateTransferInput(await readBody(event))
    return await updateTransfer(supabase, id, input)
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Invalid transfer.' })
  }
})
