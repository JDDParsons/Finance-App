import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MAX_TAGS_PER_EXPENSE,
  TAG_COLORS,
  addPendingTags,
  mergeTags,
  nextTagColor,
  normalizeTagList,
  normalizeTagName,
  suggestTags,
} from '../utils/tags.ts'
import { buildOptimisticEdit, buildOptimisticRow } from '../utils/offlineRows.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('look-alike spellings are the same tag', () => {
  for (const typed of ['Dinner Party', '#dinnerparty', '##DINNERPARTY', '  dinner   party ', '＃ＤｉｎｎｅｒＰａｒｔｙ'.replace('＃', '#')]) {
    assert.deepEqual(normalizeTagName(typed), { ok: true, name: '#dinnerparty' }, typed)
  }
})

test('symbols and emoji are allowed in a tag name', () => {
  assert.deepEqual(normalizeTagName('2024-trip!'), { ok: true, name: '#2024-trip!' })
  assert.deepEqual(normalizeTagName('🏖️beach'), { ok: true, name: '#🏖️beach' })
})

test('empty, hidden and too long names are rejected', () => {
  assert.equal(normalizeTagName('').ok, false)
  assert.equal(normalizeTagName('  # ').ok, false)
  assert.equal(normalizeTagName('road\u200Btrip').ok, false)
  assert.equal(normalizeTagName('road\u0007trip').ok, false)
  assert.equal(normalizeTagName('a'.repeat(20)).ok, true)
  assert.equal(normalizeTagName('a'.repeat(21)).ok, false)
  // The # does not count toward the 20 characters.
  assert.equal(normalizeTagName(`#${'a'.repeat(20)}`).ok, true)
})

test('an expense can have at most 3 tags, and repeats count once', () => {
  assert.equal(MAX_TAGS_PER_EXPENSE, 3)
  assert.deepEqual(normalizeTagList(['Trip', '#trip', 'Food']), { ok: true, names: ['#trip', '#food'] })
  assert.equal(normalizeTagList(['a', 'b', 'c']).ok, true)
  assert.equal(normalizeTagList(['a', 'b', 'c', 'd']).ok, false)
  assert.equal(normalizeTagList(['a', 'b', 'c', 'A']).ok, true)
  assert.equal(normalizeTagList(['ok', '']).ok, false)
})

test('a new tag gets the least used palette color', () => {
  assert.equal(nextTagColor([]), TAG_COLORS[0])
  assert.equal(nextTagColor([{ color: TAG_COLORS[0] }]), TAG_COLORS[1])
  const allUsedOnce = TAG_COLORS.map(color => ({ color }))
  assert.equal(nextTagColor(allUsedOnce), TAG_COLORS[0])
  assert.equal(nextTagColor([...allUsedOnce, { color: TAG_COLORS[0].toUpperCase() }]), TAG_COLORS[1])
})

test('suggestions match what was typed and skip tags already chosen', () => {
  const tags = [{ name: '#roadtrip' }, { name: '#groceries' }, { name: '#trip2024' }]
  assert.deepEqual(suggestTags(tags, 'trip').map(tag => tag.name), ['#roadtrip', '#trip2024'])
  assert.deepEqual(suggestTags(tags, '#TRIP', ['#roadtrip']).map(tag => tag.name), ['#trip2024'])
  assert.equal(suggestTags(tags, '').length, 3)
})

test('pending tags are added once and replaced when the server answers', () => {
  const known = [{ id: 'a', name: '#food', color: TAG_COLORS[0] }]
  const withPending = addPendingTags(known, ['#food', '#trip'])
  assert.equal(withPending.length, 2)
  const trip = withPending.find(tag => tag.name === '#trip')
  assert.equal(trip.pending, true)
  assert.equal(trip.color, TAG_COLORS[1])
  const merged = mergeTags(withPending, [{ id: 'real', name: '#trip', color: '#ec4899' }])
  assert.deepEqual(merged.find(tag => tag.name === '#trip'), { id: 'real', name: '#trip', color: '#ec4899' })
})

test('queued expense rows carry their tag names, and edits keep them unless changed', () => {
  const created = buildOptimisticRow('expense', 'id', 'user', { amount: '5', date: '2026-11-25', entity: '', tags: ['#trip'] })
  assert.deepEqual(created.tags, ['#trip'])
  assert.deepEqual(buildOptimisticRow('expense', 'id', 'user', { amount: '5', date: '2026-11-25' }).tags, [])
  assert.equal('tags' in buildOptimisticRow('income', 'id', 'user', { amount: 5, date: '2026-11-25' }), false)

  const kept = buildOptimisticEdit('expense', created, 'user', 'id', { amount: '6', date: '2026-11-25' })
  assert.deepEqual(kept.tags, ['#trip'])
  const changed = buildOptimisticEdit('expense', created, 'user', 'id', { amount: '6', date: '2026-11-25', tags: [] })
  assert.deepEqual(changed.tags, [])
})

const sql = read('supabase/migrations/20261126120000_add_tags.sql')

test('migration creates household tables that users can only read', () => {
  assert.match(sql, /CREATE TABLE "finance-app"\."Tag"/)
  assert.match(sql, /CREATE TABLE "finance-app"\."Budget_Hit_Tag"/)
  assert.match(sql, /"Tag_household_name_key" UNIQUE \("household_id", "name"\)/)
  assert.match(sql, /FOREIGN KEY \("budget_hit_id", "household_id"\)[\s\S]*?ON DELETE CASCADE/)
  assert.match(sql, /FOREIGN KEY \("tag_id", "household_id"\)[\s\S]*?ON DELETE CASCADE/)
  assert.match(sql, /ALTER TABLE "finance-app"\."Tag" ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /ALTER TABLE "finance-app"\."Budget_Hit_Tag" ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /GRANT SELECT ON TABLE "finance-app"\."Tag" TO authenticated/)
  assert.doesNotMatch(sql, /GRANT (ALL|INSERT|UPDATE|DELETE)[^;]*"finance-app"\."(Tag|Budget_Hit_Tag)" TO (authenticated|anon)/)
})

test('migration limits tags to expenses and 3 per expense', () => {
  assert.match(sql, /Only expenses can be tagged/)
  assert.match(sql, />= 3 THEN[\s\S]*?at most 3 tags/)
  assert.match(sql, /cardinality\(names\) > 3/)
  assert.match(sql, /BEFORE INSERT ON "finance-app"\."Budget_Hit_Tag"/)
})

test('migration normalizes names like the app does', () => {
  assert.match(sql, /CREATE FUNCTION "finance-app"\."tag_name"/)
  assert.match(sql, /normalize\(coalesce\("raw", ''\), NFKC\)/)
  assert.match(sql, /'\^#\+'/)
  assert.match(sql, /char_length\(cleaned\) > 20/)
  assert.match(sql, /u200B/)
})

test('migration writes tags through functions scoped to the caller household', () => {
  for (const name of ['set_budget_hit_tags', 'create_expense_with_tags', 'list_tags', 'rename_tag', 'recolor_tag', 'delete_tag']) {
    assert.match(sql, new RegExp(`CREATE FUNCTION "finance-app"\\."${name}"`), name)
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION "finance-app"\\."${name}"`), name)
  }
  assert.equal((sql.match(/SECURITY DEFINER/g) ?? []).length >= 8, true)
  assert.equal((sql.match(/SET search_path = ''/g) ?? []).length >= 10, true)
  assert.match(sql, /A tag with that name already exists/)
  assert.match(sql, /create_budget_hit_idempotent/)
  assert.match(sql, /NOT already_saved/)
})

test('expenses carry tags through the API, the bootstrap and the offline queue', () => {
  const hits = read('server/utils/supabase/hits.ts')
  assert.match(hits, /EXPENSE_SELECT = '\*, Budget_Hit_Tag\(tag_id\)'/)
  assert.match(hits, /rpc\('create_expense_with_tags'/)
  assert.match(read('server/api/hits/index.post.ts'), /tags: readTagNames\(body\.tags\)/)
  assert.match(read('server/api/hits/[id].put.ts'), /readTagNames\(body\.tags\)/)
  assert.match(read('server/api/bootstrap.get.ts'), /getTags\(supabase\)/)
  assert.match(read('server/api/bootstrap.get.ts'), /^\s+tags,$/m)
  const store = read('app/stores/finance.ts')
  assert.match(store, /tags\.value = data\.tags \?\? \[\]/)
  assert.match(store, /tags: tags\.value\.filter\(tag => !tag\.pending\)/)
  assert.match(store, /rememberTags\(operation\.payload\.tags/)
})
