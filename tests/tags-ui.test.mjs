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

test('the expense card shows its tags and saves a change to them with the other changes', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /tags: \[\.\.\.\(row\?\.tags \?\? \[\]\)\]/)
  assert.match(card, /aria-label="Edit tags"/)
  assert.match(card, /<TagChips v-if="draft\.tags\.length" :names="draft\.tags" \/>/)
  assert.match(card, /<TagField ref="tagPicker"/)
  assert.match(card, /draft\.tags = \[\.\.\.names\]/)
  // Tags are only sent when the edit changes them.
  assert.match(card, /next\.notes,[\s\S]*?next\.tags : undefined/)
  // Field order: payee, notes, date, account, tags last (the creator and edit icon come after).
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

test('the card shows the account with a credit-card icon and larger row icons', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /fa7-solid:credit-card/)
  assert.doesNotMatch(card, /institutionLogo/)
  for (const icon of ['comment-dots', 'calendar', 'credit-card', 'tag']) {
    assert.match(card, new RegExp(`fa7-solid:${icon}" class="[^"]*size-3\\.5`))
  }
  assert.match(card, /heroicons-solid:building-library" class="size-3\.5/)
})

test('the creator sits under the tags, not indented, beside an edit icon that becomes the green save check', () => {
  const card = read('app/components/ExpenseCard.vue')
  const footer = card.slice(card.indexOf('<!-- Who created the expense'))
  assert.match(footer, /creator\.firstName/)
  assert.ok(card.indexOf('aria-label="Edit tags"') < card.indexOf('<!-- Who created the expense'))
  assert.match(footer, /heroicons-solid:pencil-square/)
  assert.match(footer, /heroicons-solid:check-circle/)
  assert.match(footer, /aria-label="Save changes"/)
  assert.match(footer, /aria-label="Cancel changes"/)
  assert.match(footer, /heroicons-solid:x-circle/)
  assert.match(footer, /aria-label="Edit expense"/)
  assert.doesNotMatch(footer.slice(0, footer.indexOf('<button')), /pl-2/)
  // The check only shows once something changed, fading in and pushing the cancel icon left.
  assert.match(footer, /isOpen && dirty \? 'max-w-8 opacity-100' : 'max-w-0 opacity-0'/)
  assert.ok(footer.indexOf('aria-label="Save changes"') < footer.indexOf('aria-label="Cancel changes"'))
})

test('collapsed cards hide the date and account, and empty notes and tags; hidden rows fade', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /<ExpandRow :open="isOpen" :expanded="isOpen">\s*<div class="relative inline-flex/)
  assert.match(card, /<!-- Account: only while expanded -->\s*<ExpandRow :open="isOpen"/)
  assert.match(card, /:open="isOpen \|\| !!draft\.notes"/)
  assert.match(card, /:open="isOpen \|\| draft\.tags\.length > 0"/)
  assert.match(read('app/components/ExpandRow.vue'), /transition-\[grid-template-rows,opacity\]/)
})

test('a tap away does not collapse a card with unsaved changes', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /if \(anyEditing\.value \|\| dirty\.value\) return\s+if \(!\(event\.target as HTMLElement\)\.closest/)
})

test('only one field editor is open at a time, and cancel drops the draft', () => {
  const card = read('app/components/ExpenseCard.vue')
  assert.match(card, /function startField[\s\S]*?closeEditors\(\)\s*editing\[field\] = true/)
  assert.match(card, /function cancel\(\)[\s\S]*?resetDraft\(\)\s*finish\(\)/)
})

test('opening a picker closes the open editor, notes are underlined while edited, and the account select is narrow', () => {
  const card = read('app/components/ExpenseCard.vue')
  for (const name of ['openEntityPicker', 'openTagPicker', 'startBudgetChange', 'onDateClick']) {
    const body = card.slice(card.indexOf(`function ${name}`))
    assert.ok(body.slice(0, body.indexOf('\n}')).includes('closeEditors()'), name)
  }
  assert.match(card, /<textarea[^>]*border-b border-info\/50 bg-transparent text-base/)
  assert.doesNotMatch(card, /UTextarea/)
  assert.match(card, /<USelect[^>]*class="w-48 max-w-full"/)
})

test('the tag picker blocks the modal from focusing anything when it opens', () => {
  const field = read('app/components/TagField.vue')
  assert.match(field, /<UModal[^>]*onOpenAutoFocus: \(event: Event\) => event\.preventDefault\(\)/)
  assert.doesNotMatch(field, /Close tag picker/)
  // The payee picker blocks it the same way.
  assert.match(read('app/components/EntityField.vue'), /<UModal[^>]*onOpenAutoFocus: \(event: Event\) => event\.preventDefault\(\)/)
})
