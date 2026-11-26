import type { Tag, TagSummary } from '../../../utils/tags'
import { apiFetch } from '~/composables/useApiToken'

export function useTagsApi() {
  function getTags() {
    return apiFetch<Tag[]>('/api/tags')
  }

  function listTags() {
    return apiFetch<TagSummary[]>('/api/tags/summary')
  }

  function updateTag(id: string, changes: { name?: string; color?: string }) {
    return apiFetch<Tag>(`/api/tags/${id}`, { method: 'PUT', body: changes })
  }

  function deleteTag(id: string) {
    return apiFetch<{ success: boolean }>(`/api/tags/${id}`, { method: 'DELETE' })
  }

  return { getTags, listTags, updateTag, deleteTag }
}
