import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { formatLongDate, greetingFor, isDaytime } from '../utils/greeting.ts'

const at = (hour, minute = 0) => new Date(2026, 10, 27, hour, minute)

test('greets by the time of day', () => {
  assert.equal(greetingFor(at(4, 59)), 'Good evening')
  assert.equal(greetingFor(at(5)), 'Good morning')
  assert.equal(greetingFor(at(11, 59)), 'Good morning')
  assert.equal(greetingFor(at(12)), 'Good afternoon')
  assert.equal(greetingFor(at(16, 59)), 'Good afternoon')
  assert.equal(greetingFor(at(17)), 'Good evening')
  assert.equal(greetingFor(at(0)), 'Good evening')
})

test('treats 6:00 to 18:00 as daytime', () => {
  assert.equal(isDaytime(at(5, 59)), false)
  assert.equal(isDaytime(at(6)), true)
  assert.equal(isDaytime(at(17, 59)), true)
  assert.equal(isDaytime(at(18)), false)
})

test('writes the date in long form', () => {
  assert.equal(formatLongDate(at(9)), 'Friday, November 27, 2026')
})

test('the home page greets the user in the header and shows the status line on the income chart', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')

  assert.match(homePage, /<template #title>\s*<HomeGreeting :first-name="profileStore\.profile\?\.first_name" \/>/)
  assert.match(homePage, />Total expenses and income<\/h3>\s*<h4 class="text-center text-sm">\{\{ statusMessage\.subtitle \}\}<\/h4>/)
  assert.doesNotMatch(homePage, /statusMessage\.headline|periodLabel|Track your financial well-being/)
})
