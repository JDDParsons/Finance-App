// Renames and/or recolors a tag. The database checks the name and the color.
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const name = typeof body?.name === 'string' ? body.name : undefined
  const color = typeof body?.color === 'string' ? body.color : undefined
  if (name === undefined && color === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Send a name or a color.' })
  }

  let tag = null
  if (name !== undefined) tag = await renameTag(supabase, id, name)
  if (color !== undefined) tag = await recolorTag(supabase, id, color)
  return tag
})
