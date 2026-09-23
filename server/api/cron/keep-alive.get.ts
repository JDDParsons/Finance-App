import { createClient } from '@supabase/supabase-js'

import { isValidCronAuthorization } from '../../utils/cron-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')

  if (!config.cronSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Cron is not configured' })
  }

  if (!isValidCronAuthorization(authorization, config.cronSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase is not configured' })
  }

  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { error } = await supabase
    .from('Profile')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Supabase keep-alive failed:', error.message)
    throw createError({ statusCode: 502, statusMessage: 'Supabase keep-alive failed' })
  }

  return { success: true }
})
