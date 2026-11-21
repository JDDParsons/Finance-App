import { getSupabase } from '~/composables/supabase/client'
import {
  NotAuthenticatedError,
  SessionUnavailableError,
  TOKEN_TIMEOUT_MS,
} from '~/composables/supabase/session'
import { isNetworkAuthError, withTimeout } from '../../utils/authSession'

async function readSession() {
  try {
    return await withTimeout(getSupabase().auth.getSession(), TOKEN_TIMEOUT_MS)
  } catch (error) {
    if (isNetworkAuthError(error)) return { timedOut: true as const }
    throw error
  }
}

export async function getApiToken(): Promise<string> {
  const result = await readSession()
  // A refresh that cannot reach the server is a connection problem, not a sign-out.
  if (result.timedOut) throw new SessionUnavailableError()

  const { data: { session }, error } = result.value
  if (session?.access_token) return session.access_token
  if (isNetworkAuthError(error)) throw new SessionUnavailableError()
  throw new NotAuthenticatedError()
}

export async function apiFetch<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  const method = String(opts.method ?? 'GET').toUpperCase()
  if (import.meta.client && !navigator.onLine) {
    // Fail fast: waiting for a token refresh that cannot reach the server only delays the error.
    throw new Error(method === 'GET'
      ? 'You are offline.'
      : 'You are offline. Changes can be saved once you reconnect.')
  }
  const token = await getApiToken()
  return $fetch<T>(path, {
    ...opts,
    headers: {
      ...(opts.headers as Record<string, string> || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
