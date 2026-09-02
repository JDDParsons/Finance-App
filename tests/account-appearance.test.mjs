import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  accountDisplayName,
  DEFAULT_ACCOUNT_ICON,
  normalizeAccountIcon,
  resolveAccountIcon,
} from '../utils/accountAppearance.ts'

test('account names consistently include the institution first', () => {
  assert.equal(accountDisplayName({ institution: 'TD', name: 'Visa' }), 'TD Visa')
  assert.equal(accountDisplayName({ institution: 'BMO', name: 'Chequing' }), 'BMO Chequing')
  assert.equal(accountDisplayName({ institution: 'Questrade', name: 'Questrade TFSA' }), 'Questrade TFSA')
  assert.equal(accountDisplayName({ institution: 'Scotiabank' }), 'Scotiabank')
  assert.equal(accountDisplayName({ name: 'Cash' }), 'Cash')
  assert.equal(accountDisplayName(null, 'Unknown account'), 'Unknown account')
})

test('account icons resolve to building-library when missing or unsupported', () => {
  assert.equal(resolveAccountIcon(null), DEFAULT_ACCOUNT_ICON)
  assert.equal(resolveAccountIcon('unexpected'), DEFAULT_ACCOUNT_ICON)
  assert.equal(resolveAccountIcon('heroicons-solid:credit-card'), 'heroicons-solid:credit-card')
})

test('account icon API validation only permits selectable icons', () => {
  assert.equal(normalizeAccountIcon(DEFAULT_ACCOUNT_ICON), DEFAULT_ACCOUNT_ICON)
  assert.equal(normalizeAccountIcon('heroicons-solid:credit-card'), 'heroicons-solid:credit-card')
  assert.throws(() => normalizeAccountIcon('heroicons-solid:wallet'), /Invalid account icon/)
})

test('account appearance migration is nullable and constrains icon values', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260902150000_add_account_appearance.sql', import.meta.url), 'utf8')
  assert.match(sql, /add column if not exists color text/i)
  assert.match(sql, /add column if not exists icon text/i)
  assert.match(sql, /building-library/)
  assert.match(sql, /credit-card/)
  assert.doesNotMatch(sql, /not null/i)
})
