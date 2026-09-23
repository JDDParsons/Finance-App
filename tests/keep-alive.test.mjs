import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { isValidCronAuthorization } from '../server/utils/cron-auth.ts'

test('authorizes only a matching configured cron secret', () => {
  assert.equal(isValidCronAuthorization('Bearer expected-secret', 'expected-secret'), true)
  assert.equal(isValidCronAuthorization(undefined, 'expected-secret'), false)
  assert.equal(isValidCronAuthorization('Bearer wrong-secret', 'expected-secret'), false)
  assert.equal(isValidCronAuthorization('Bearer ', ''), false)
  assert.equal(isValidCronAuthorization(undefined, undefined), false)
})

test('configures the keep-alive cron to run daily at 05:00 UTC', async () => {
  const contents = await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
  const config = JSON.parse(contents)

  assert.deepEqual(config.crons, [{
    path: '/api/cron/keep-alive',
    schedule: '0 5 * * *',
  }])
})
