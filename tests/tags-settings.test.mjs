import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('settings links to the tags page', () => {
  const page = read('app/pages/settings/index.vue')
  assert.match(page, /to: '\/settings\/tags'/)
  assert.match(page, /title: 'Tags'/)
  assert.match(page, /Rename, recolor or delete your tags/)
})

test('tag routes list, update and delete through the database functions', () => {
  assert.match(read('server/api/tags/summary.get.ts'), /listTags\(supabase\)/)
  const put = read('server/api/tags/[id].put.ts')
  assert.match(put, /renameTag\(supabase, id, name\)/)
  assert.match(put, /recolorTag\(supabase, id, color\)/)
  assert.match(read('server/api/tags/[id].delete.ts'), /deleteTag\(supabase, id\)/)
  // A missing tag or a clash comes back as a clear status, for delete too.
  assert.match(read('server/utils/supabase/tags.ts'), /rpc\('delete_tag'[^\n]*\n\s*if \(error\) throwTagError\(error\)/)
})

test('the tags page is online-only, syncs the queue first and refreshes everything after a change', () => {
  const page = read('app/pages/settings/tags.vue')
  assert.match(page, /ensureQueueEmpty/)
  assert.match(page, /pendingSyncCount/)
  assert.match(page, /failedSyncCount/)
  assert.match(page, /precacheRecentMonths\(true\)/)
  assert.match(page, /appData\.refresh\(\)/)
  assert.match(page, /:disabled="appData\.isOffline\.value \|\| preparing"/)
  // Renaming onto another tag is rejected, and delete asks first.
  assert.match(page, /already exists\. Tag names must be different/)
  assert.match(page, /This cannot be undone/)
  assert.match(page, /TAG_COLORS/)
})
