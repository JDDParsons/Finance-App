import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { EntitySummary } from '../../../utils/entities'

export type { EntitySummary }

export interface RenameEntityResult {
  name: string
  merged: boolean
  expensesUpdated: number
  incomeUpdated: number
}

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

export async function listEntities(supabase: SupabaseClient): Promise<EntitySummary[]> {
  const { data, error } = await getClient(supabase).rpc('list_entities')
  if (error) throw error
  return (data ?? []) as EntitySummary[]
}

export async function renameEntity(
  supabase: SupabaseClient,
  sourceKey: string,
  newName: string
): Promise<RenameEntityResult> {
  const { data, error } = await getClient(supabase).rpc('rename_entity', {
    source_key: sourceKey,
    new_name: newName,
  })
  if (error) {
    // 22023 is the function's "invalid input" error, such as an empty or too long name.
    if (error.code === '22023') {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
  return data as RenameEntityResult
}
