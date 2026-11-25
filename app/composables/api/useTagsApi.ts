import type { Tag } from '../../../utils/tags'
import { apiFetch } from '~/composables/useApiToken'

export function useTagsApi() {
  function getTags() {
    return apiFetch<Tag[]>('/api/tags')
  }

  return { getTags }
}
