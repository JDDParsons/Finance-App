import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getSyncStatus } from '../utils/syncStatus.ts'

const idle = { isOffline: false, syncing: false, pendingCount: 0, failedCount: 0 }

test('online with nothing waiting is synced (green)', () => {
  const status = getSyncStatus(idle)
  assert.equal(status.state, 'synced')
  assert.equal(status.color, 'success')
  assert.equal(status.icon, 'fa7-regular:circle-check')
  assert.equal(status.spin, false)
})

test('offline is grey and mentions waiting changes', () => {
  assert.equal(getSyncStatus({ ...idle, isOffline: true }).label, 'Offline')
  const waiting = getSyncStatus({ ...idle, isOffline: true, pendingCount: 2, failedCount: 1 })
  assert.equal(waiting.state, 'offline')
  assert.equal(waiting.color, 'neutral')
  assert.equal(waiting.icon, 'fa7-regular:cloud')
  assert.equal(waiting.label, 'Offline, 3 changes waiting to sync')
})

test('offline wins over a running sync and failed changes', () => {
  assert.equal(getSyncStatus({ isOffline: true, syncing: true, pendingCount: 1, failedCount: 1 }).state, 'offline')
})

test('a running sync is blue and spins', () => {
  const status = getSyncStatus({ ...idle, syncing: true, pendingCount: 1 })
  assert.equal(status.state, 'syncing')
  assert.equal(status.color, 'info')
  assert.equal(status.icon, 'fa7-solid:arrows-rotate')
  assert.equal(status.spin, true)
  assert.equal(status.label, 'Syncing 1 change')
})

test('fetching fresh data shows as syncing', () => {
  const status = getSyncStatus({ ...idle, refreshing: true })
  assert.equal(status.state, 'syncing')
  assert.equal(status.color, 'info')
  assert.equal(status.label, 'Syncing')
  assert.equal(getSyncStatus({ ...idle, isOffline: true, refreshing: true }).state, 'offline')
})

test('a sync in progress pulses the dot at the bottom left of the avatar, without a banner', async () => {
  const header = await readFile(new URL('../app/components/AppHeader.vue', import.meta.url), 'utf8')
  const composable = await readFile(new URL('../app/composables/useSyncStatus.ts', import.meta.url), 'utf8')
  const app = await readFile(new URL('../app/app.vue', import.meta.url), 'utf8')

  assert.match(header, /position="bottom-left"/)
  assert.match(header, /after:animate-ping/)
  assert.match(composable, /refreshing: appData\.refreshing\.value/)
  const notice = app.match(/const syncNotice = computed\(\(\) => \{[\s\S]*?\n\}\)/)?.[0] ?? ''
  assert.ok(notice.length > 0)
  assert.doesNotMatch(notice, /appData\.syncing|appData\.refreshing|Updating|Syncing/)
})

test('changes waiting while online are blue but do not spin', () => {
  const status = getSyncStatus({ ...idle, pendingCount: 2 })
  assert.equal(status.state, 'syncing')
  assert.equal(status.color, 'info')
  assert.equal(status.spin, false)
  assert.equal(status.label, '2 changes waiting to sync')
})

test('failed changes are amber and never shown as synced', () => {
  const one = getSyncStatus({ ...idle, failedCount: 1 })
  assert.equal(one.state, 'attention')
  assert.equal(one.color, 'warning')
  assert.equal(one.icon, 'fa7-solid:triangle-exclamation')
  assert.equal(one.label, '1 change needs attention')
  assert.equal(getSyncStatus({ ...idle, failedCount: 3 }).label, '3 changes need attention')
  assert.equal(getSyncStatus({ ...idle, failedCount: 1, pendingCount: 2 }).state, 'attention')
})

test('a sync in progress takes priority over failed changes', () => {
  assert.equal(getSyncStatus({ ...idle, syncing: true, failedCount: 1 }).state, 'syncing')
})

test('every status icon is bundled so it renders offline', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  for (const icon of [
    'fa7-regular:cloud',
    'fa7-regular:circle-check',
    'fa7-solid:arrows-rotate',
    'fa7-solid:triangle-exclamation',
  ]) {
    assert.ok(config.includes(`'${icon}'`), icon)
  }
  assert.match(config, /'fa7-regular',/)
  assert.match(config, /'fa7-solid',/)
})

test('the banner sits below the header, not at the top edge', async () => {
  const app = await readFile(new URL('../app/app.vue', import.meta.url), 'utf8')
  const css = await readFile(new URL('../app/assets/css/main.css', import.meta.url), 'utf8')
  const banner = app.match(/<div\s+v-if="isAuthenticated && syncNotice[\s\S]*?role="status"/)?.[0] ?? ''
  assert.ok(banner.length > 0)
  assert.match(banner, /top-below-header/)
  assert.doesNotMatch(banner, /top-safe/)
  assert.match(css, /@utility top-below-header/)
})
