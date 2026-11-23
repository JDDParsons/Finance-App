import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isNetworkAuthError, resolveAuthState, withTimeout } from '../utils/authSession.ts'

const read = async (path) => (await readFile(path, 'utf8')).replace(/\r\n/g, '\n')

test('a valid session is signed in', () => {
  assert.deepEqual(
    resolveAuthState({ session: { user: { id: 'u1' } }, savedUserId: null }),
    { state: 'signed-in', userId: 'u1' },
  )
})

test('an expired token that cannot refresh offline counts as signed in offline', () => {
  const error = Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError' })
  assert.deepEqual(
    resolveAuthState({ session: null, error, savedUserId: 'u1' }),
    { state: 'offline', userId: 'u1' },
  )
  assert.deepEqual(resolveAuthState({ session: null, savedUserId: 'u1', online: false }), { state: 'offline', userId: 'u1' })
  assert.deepEqual(resolveAuthState({ session: null, savedUserId: 'u1', timedOut: true }), { state: 'offline', userId: 'u1' })
})

test('no saved user means signed out even when the network is down', () => {
  assert.deepEqual(resolveAuthState({ session: null, savedUserId: null, online: false }), { state: 'signed-out' })
})

test('no session and no error is signed out; a real auth error is signed out', () => {
  assert.deepEqual(resolveAuthState({ session: null, savedUserId: 'u1', online: true }), { state: 'signed-out' })
  const error = Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 })
  assert.deepEqual(resolveAuthState({ session: null, error, savedUserId: 'u1', online: true }), { state: 'signed-out' })
})

test('isNetworkAuthError recognizes network failures only', () => {
  assert.equal(isNetworkAuthError(Object.assign(new Error('x'), { name: 'AuthRetryableFetchError' })), true)
  assert.equal(isNetworkAuthError(new TypeError('Failed to fetch')), true)
  assert.equal(isNetworkAuthError(new TypeError('Load failed')), true)
  assert.equal(isNetworkAuthError(new Error('Invalid login')), false)
  assert.equal(isNetworkAuthError(null), false)
})

test('withTimeout returns the value or reports a timeout, and swallows a late rejection', async () => {
  assert.deepEqual(await withTimeout(Promise.resolve(5), 50), { timedOut: false, value: 5 })
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error('late')), 30))
  assert.deepEqual(await withTimeout(late, 5), { timedOut: true })
  await new Promise(resolve => setTimeout(resolve, 50))
})

test('session handling is shared and keeps unsynced changes', async () => {
  const session = await read('app/composables/supabase/session.ts')
  const client = await read('app/composables/supabase/client.ts')
  const queue = await read('app/utils/offlineQueue.client.ts')
  const appData = await read('app/composables/useAppData.ts')
  const auth = await read('app/composables/supabase/auth.ts')

  assert.match(client, /let client: SupabaseClient \| null = null/)
  assert.match(queue, /getSavedUserId\(\)/)
  assert.doesNotMatch(queue, /auth\.getSession\(\)/)
  assert.match(session, /resolveAuthState/)
  const handler = appData.match(/async function handleSessionExpired\(\) \{[\s\S]*?\n  \}\n/)?.[0] ?? ''
  assert.ok(handler.length > 0)
  assert.doesNotMatch(handler, /clearOfflineFinanceCache/)
  assert.match(auth, /clearSavedUserId\(\)/)

  for (const file of ['app/middleware/01.auth.global.ts', 'app/pages/index.vue', 'app/stores/profile.ts', 'app/composables/useAppData.ts']) {
    assert.doesNotMatch(await read(file), /auth\.getSession\(\)/, file)
  }
})
