import { getSupabase } from './client'
import {
  resolveAuthState,
  withTimeout,
  type AuthState,
} from '../../../utils/authSession'

const SAVED_USER_KEY = 'budgify:user-id'

/** Longest the app waits for the session to resolve before treating the connection as unusable. */
export const SESSION_CHECK_TIMEOUT_MS = 4000
/** Longest a request waits for a (possibly refreshed) access token. */
export const TOKEN_TIMEOUT_MS = 8000

/** There is no usable login: the user has to sign in. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'NotAuthenticatedError'
  }
}

/** A login exists, but a valid token could not be obtained right now (no or poor connection). */
export class SessionUnavailableError extends Error {
  constructor() {
    super('Could not refresh your session. Check your connection.')
    this.name = 'SessionUnavailableError'
  }
}

/** The server rejected the login (401) or there is no login at all. */
export function isSessionExpiredError(error: any) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status
  return status === 401 || error instanceof NotAuthenticatedError
}

// The saved user id lets the app open and queue changes without a valid token.
// It is not a credential: it only selects which cached data to show on this device.
export function getSavedUserId(): string | null {
  try {
    return localStorage.getItem(SAVED_USER_KEY)
  } catch {
    return null
  }
}

export function saveUserId(userId: string) {
  try {
    if (localStorage.getItem(SAVED_USER_KEY) !== userId) localStorage.setItem(SAVED_USER_KEY, userId)
  } catch {
    // Storage can be unavailable (private mode, quota); the app then just needs a connection to open.
  }
}

export function clearSavedUserId() {
  try {
    localStorage.removeItem(SAVED_USER_KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * Works out whether the user is signed in, signed in but offline, or signed out.
 * Never waits long on the network, and never treats an unreachable server as "signed out".
 */
export async function resolveSession(): Promise<AuthState> {
  const savedUserId = getSavedUserId()
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  // Offline with a known user: don't ask Supabase. With an expired token it would
  // try to refresh and hang until the request times out.
  if (!online && savedUserId) {
    return resolveAuthState({ session: null, savedUserId, online })
  }

  let state: AuthState
  try {
    const result = await withTimeout(getSupabase().auth.getSession(), SESSION_CHECK_TIMEOUT_MS)
    state = result.timedOut
      ? resolveAuthState({ session: null, savedUserId, online, timedOut: true })
      : resolveAuthState({
          session: result.value.data.session,
          error: result.value.error,
          savedUserId,
          online,
        })
  } catch (error) {
    state = resolveAuthState({ session: null, error, savedUserId, online })
  }

  if (state.state === 'signed-in') saveUserId(state.userId)
  else if (state.state === 'signed-out' && online) clearSavedUserId()
  return state
}
