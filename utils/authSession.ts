// Decides whether the user counts as signed in, using only plain values so it can be unit tested.

export type AuthState =
  | { state: 'signed-in'; userId: string }
  | { state: 'offline'; userId: string }
  | { state: 'signed-out' }

/** True when the error means the server could not be reached (not that the login is invalid). */
export function isNetworkAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { name, message } = error as { name?: string; message?: string }
  if (name === 'AuthRetryableFetchError') return true
  return error instanceof TypeError && /fetch|network|load failed/i.test(message ?? '')
}

export function resolveAuthState(input: {
  session: { user?: { id?: string | null } | null } | null | undefined
  error?: unknown
  savedUserId: string | null
  timedOut?: boolean
  online?: boolean
}): AuthState {
  const sessionUserId = input.session?.user?.id
  if (sessionUserId) return { state: 'signed-in', userId: sessionUserId }

  const unreachable = input.timedOut === true || input.online === false || isNetworkAuthError(input.error)
  if (unreachable && input.savedUserId) return { state: 'offline', userId: input.savedUserId }
  return { state: 'signed-out' }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), ms)
  })
  // If the timeout wins, a later rejection of the original promise must not be unhandled.
  const settled = promise.then((value) => ({ timedOut: false as const, value }))
  settled.catch(() => {})
  try {
    return await Promise.race([settled, timeout])
  } finally {
    clearTimeout(timer)
  }
}
