import assert from 'node:assert/strict'
import test from 'node:test'

import { getCurrentMonthStatusMessage, getPastMonthStatusMessage } from '../utils/statusMessage.ts'

function status(savedPercentage) {
  return getPastMonthStatusMessage({
    monthName: 'August',
    totalIncome: 100,
    totalExpenses: 100 - savedPercentage,
  })
}

test('describes an older month whose expenses exceeded income', () => {
  assert.deepEqual(status(-1), {
    headline: 'August was tough.',
    subtitle: 'Your expenses exceeded your income.',
  })
})

test('describes each older-month savings band with its saved percentage', () => {
  assert.deepEqual(status(0), {
    headline: 'August was close.',
    subtitle: 'You saved 0% of your income!',
  })
  assert.equal(status(14).headline, 'August was close.')
  assert.equal(status(15).headline, 'August was solid.')
  assert.equal(status(34).headline, 'August was solid.')
  assert.equal(status(35).headline, 'August was strong!')
  assert.equal(status(54).headline, 'August was strong!')
  assert.deepEqual(status(55), {
    headline: 'August was outstanding!',
    subtitle: 'You saved 55% of your income!',
  })
})

test('rounds the displayed savings percentage to a whole number', () => {
  const result = getPastMonthStatusMessage({
    monthName: 'August',
    totalIncome: 300,
    totalExpenses: 200,
  })

  assert.equal(result.subtitle, 'You saved 33% of your income!')
})

function currentStatus(dayOfMonth, remainingPercentage) {
  return getCurrentMonthStatusMessage({
    monthName: 'August',
    dayOfMonth,
    totalIncome: 100,
    totalExpenses: 100 - remainingPercentage,
  })
}

test('uses the early-month baseline through day 10', () => {
  assert.deepEqual(currentStatus(10, 40), {
    headline: 'August is looking decent so far!',
    subtitle: '40% of your income is still unspent.',
  })
  assert.deepEqual(currentStatus(1, 39), {
    headline: 'August spending is a bit high.',
    subtitle: '39% of your income is left.',
  })
})

test('uses the mid-month baseline from day 11 through day 20', () => {
  assert.deepEqual(currentStatus(11, 30), {
    headline: 'August is going well!',
    subtitle: '30% of your income is still unspent.',
  })
  assert.deepEqual(currentStatus(20, 29), {
    headline: 'August is looking shaky.',
    subtitle: '29% of your income is left.',
  })
})

test('uses the late-month baseline from day 21 through month end', () => {
  assert.deepEqual(currentStatus(21, 15), {
    headline: 'August is shaping up!',
    subtitle: '15% of your income is still unspent.',
  })
  assert.deepEqual(currentStatus(31, 14), {
    headline: 'August could be slipping.',
    subtitle: '14% of your income is left.',
  })
})

test('rounds and clamps the current-month remaining percentage', () => {
  assert.equal(currentStatus(5, 40.4).subtitle, '40% of your income is still unspent.')
  assert.equal(currentStatus(25, -10).subtitle, '0% of your income is left.')
})
