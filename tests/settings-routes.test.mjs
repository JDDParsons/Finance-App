import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')

test('settings lists bank accounts and payment entities, each with subtext', async () => {
  const page = await read('app/pages/settings/index.vue')
  assert.match(page, /to: '\/settings\/accounts'/)
  assert.match(page, /title: 'Bank accounts'/)
  assert.match(page, /Add, remove, or edit your bank accounts/)
  assert.match(page, /to: '\/settings\/entities'/)
  assert.match(page, /title: 'Payment entities'/)
  assert.match(page, /Rename or merge your payment entities/)
})

test('the accounts page moved to /settings/accounts and /accounts is gone', async () => {
  await access(new URL('../app/pages/settings/accounts.vue', import.meta.url))
  await access(new URL('../app/pages/settings/entities.vue', import.meta.url))
  await assert.rejects(access(new URL('../app/pages/accounts/index.vue', import.meta.url)))
})

test('the profile page links to settings and no longer wraps the accounts page', async () => {
  const profile = await read('app/pages/profile/index.vue')
  assert.match(profile, /to="\/settings"/)
  assert.match(profile, /Sign out/)
  assert.doesNotMatch(profile, /UColorModeSwitch/)
  assert.doesNotMatch(profile, /AccountsPage/)
})

test('the light/dark switch lives in settings, and accounts no longer shows the profile', async () => {
  assert.match(await read('app/pages/settings/index.vue'), /UColorModeSwitch/)
  const accounts = await read('app/pages/settings/accounts.vue')
  assert.doesNotMatch(accounts, /UColorModeSwitch|useSignOut|useProfileStore/)
})
