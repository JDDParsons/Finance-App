import { apiFetch } from '~/composables/useApiToken'

export function useProfileApi() {
  function getProfile() {
    return apiFetch<any>('/api/profile')
  }

  return { getProfile }
}
