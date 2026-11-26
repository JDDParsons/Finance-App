import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Tag, TagSummary } from '../../../utils/tags'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

/** Turns the database's tag errors into HTTP errors the app can show or recognize. */
export function throwTagError(error: { code?: string; message?: string }): never {
  // 22023: invalid input (a bad name, more than 3 tags). 23505: the name is taken.
  if (error.code === '22023' || error.code === '23505') {
    throw createError({ statusCode: error.code === '23505' ? 409 : 400, statusMessage: error.message })
  }
  // P0002: the expense or tag was deleted elsewhere, so a queued change is dropped.
  if (error.code === 'P0002') {
    throw createError({ statusCode: 404, statusMessage: error.message })
  }
  throw error
}

export async function getTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await getClient(supabase)
    .from('Tag')
    .select('id, name, color')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Tag[]
}

/** Replaces the tags on an expense with the given names. Returns the tags it now has. */
export async function setBudgetHitTags(
  supabase: SupabaseClient,
  hitId: string,
  tagNames: string[]
): Promise<Tag[]> {
  const { data, error } = await getClient(supabase).rpc('set_budget_hit_tags', {
    hit_id: hitId,
    tag_names: tagNames,
  })
  if (error) throwTagError(error)
  return (data ?? []) as Tag[]
}

/** Accepts the `tags` of a request body: a list of names, or nothing. */
export function readTagNames(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw createError({ statusCode: 400, statusMessage: 'Tags must be a list of names.' })
  }
  return value as string[]
}

export async function listTags(supabase: SupabaseClient): Promise<TagSummary[]> {
  const { data, error } = await getClient(supabase).rpc('list_tags')
  if (error) throw error
  return (data ?? []) as TagSummary[]
}

export async function renameTag(supabase: SupabaseClient, id: string, name: string): Promise<Tag> {
  const { data, error } = await getClient(supabase).rpc('rename_tag', { target_tag_id: id, new_name: name })
  if (error) throwTagError(error)
  return data as Tag
}

export async function recolorTag(supabase: SupabaseClient, id: string, color: string): Promise<Tag> {
  const { data, error } = await getClient(supabase).rpc('recolor_tag', { target_tag_id: id, new_color: color })
  if (error) throwTagError(error)
  return data as Tag
}

export async function deleteTag(supabase: SupabaseClient, id: string) {
  const { error } = await getClient(supabase).rpc('delete_tag', { target_tag_id: id })
  if (error) throwTagError(error)
}
