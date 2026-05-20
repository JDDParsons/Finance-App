import { apiFetch } from '~/composables/useApiToken'

export function useUploadApi() {
  async function uploadFile(file: File) {
    const csvText = await file.text()
    return apiFetch<{ count: number | null }>('/api/upload', {
      method: 'POST',
      body: { csvText, filename: file.name },
    })
  }

  return { uploadFile }
}
