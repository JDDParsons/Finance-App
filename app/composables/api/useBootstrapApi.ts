import type { BootstrapResponse } from '~/types/bootstrap'
import { apiFetch } from '~/composables/useApiToken'

export function useBootstrapApi() {
  function getBootstrap(year: number, month: number) {
    return apiFetch<BootstrapResponse>(`/api/bootstrap?year=${year}&month=${month}`)
  }

  return { getBootstrap }
}
