import { apiFetch } from '~/composables/useApiToken'
import type { EntitySummary } from '../../../utils/entities'

export interface RenameEntityResult {
  name: string
  merged: boolean
  expensesUpdated: number
  incomeUpdated: number
}

export function useEntitiesApi() {
  function listEntities() {
    return apiFetch<EntitySummary[]>('/api/entities')
  }

  function renameEntity(key: string, name: string) {
    return apiFetch<RenameEntityResult>('/api/entities/rename', {
      method: 'POST',
      body: { key, name },
    })
  }

  return { listEntities, renameEntity }
}
