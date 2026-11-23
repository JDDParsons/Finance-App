export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)

  const key = typeof body?.key === 'string' ? body.key : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!key || key.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an entity to rename.' })
  }
  if (!name || name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a name of 1 to 100 characters.' })
  }

  return renameEntity(supabase, key, name)
})
