import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('the create flow has a Tags pill for expenses, shown like the other pills', () => {
  const step = read('app/components/cashflow/create/StepAmount.vue')
  assert.match(step, /defineModel<string\[\]>\('tags'/)
  assert.match(step, /<TagPill\s+v-if="!isIncome"\s+icon="fa7-solid:tag"/)
  assert.match(step, /:filled="tags\.length > 0"/)
  assert.match(step, /<TagField v-if="!isIncome" ref="tagField" v-model="tags" \/>/)
  // One tag shows its name; more show the first and how many others.
  assert.match(step, /\$\{first\} \+\$\{tags\.value\.length - 1\}/)
})

test('the create modal saves the chosen tags with the expense and starts empty each time', () => {
  const modal = read('app/components/cashflow/CreateModal.vue')
  assert.match(modal, /v-model:tags="tags"/)
  assert.match(modal, /store\.addExpense\([^\n]*notes\.value, tags\.value\)/)
  assert.match(modal, /tags\.value = \[\]/)
  assert.doesNotMatch(modal, /addIncome\([^\n]*tags/)
})

test('the picker adds by tap or typing, creates new tags, and stops at the limit', () => {
  const field = read('app/components/TagField.vue')
  assert.match(field, /MAX_TAGS_PER_EXPENSE/)
  assert.match(field, /@keydown\.enter\.prevent="addTyped"/)
  assert.match(field, /Create \{\{ newName \}\}/)
  assert.match(field, /interactive/)
  assert.match(field, /removable/)
  assert.match(field, /defineExpose\(\{ open \}\)/)
  // The choice is only handed back when Done is tapped.
  assert.match(field, /function done\(\)[\s\S]*?emit\('update:modelValue'/)
  assert.match(field, /Cancel/)
})

test('the expense card shows its tags and saves a change to them on their own', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /const tags = computed<string\[\]>\(\(\) => hit\.value\?\.tags \?\? \[\]\)/)
  assert.match(card, /aria-label="Edit tags"/)
  assert.match(card, /<TagChips v-if="tags\.length" :names="tags" \/>/)
  assert.match(card, /<TagField ref="tagPicker"/)
  assert.match(card, /void commit\(\{ tags: names \}\)/)
  // Tags are only sent when the edit changes them.
  assert.match(card, /next\.notes,[\s\S]*?patch\.tags/)
  // Field order: payee, notes, date, account, tags last.
  const order = ['Edit payee', 'Edit notes', 'Edit date', 'Edit account', 'Edit tags'].map(label => card.indexOf(label))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.ok(order.every(position => position > -1))
  // Income cards do not have tags.
  assert.doesNotMatch(read('app/components/IncomeCard.vue'), /tags/i)
})

test('tag chips use the tag color and the household list', () => {
  assert.match(read('app/components/TagChip.vue'), /\$\{color \|\| '#9ca3af'\}33/)
  assert.match(read('app/components/TagChips.vue'), /store\.tagsByName\.get\(name\)\?\.color/)
})

test('tags use the tag icon, have no color dot, and the picker does not focus its input', () => {
  assert.match(read('app/components/ExpenseCard.vue'), /fa7-solid:tag/)
  assert.match(read('app/pages/settings/index.vue'), /fa7-solid:tag/)
  assert.doesNotMatch(read('app/components/TagChip.vue'), /rounded-full" :style/)
  const field = read('app/components/TagField.vue')
  assert.doesNotMatch(field, /\.focus\(/)
})
