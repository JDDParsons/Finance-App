import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const shellIconNames = [
  'home-solid',
  'rectangle-stack-solid',
  'plus-solid',
  'calendar-days-solid',
]

test('shell navigation and month selector use locally bundled Heroicons', async () => {
  const [bottomNav, sideNav, monthSelector, heroiconsFile] = await Promise.all([
    readFile(new URL('../app/components/BottomNav.vue', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/SideNav.vue', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/MonthSelector.vue', import.meta.url), 'utf8'),
    readFile(new URL('../node_modules/@iconify-json/heroicons/icons.json', import.meta.url), 'utf8'),
  ])
  const heroicons = JSON.parse(heroiconsFile)

  for (const source of [bottomNav, sideNav]) {
    assert.match(source, /icon: 'heroicons:home-solid'/)
    assert.match(source, /icon: 'heroicons:rectangle-stack-solid'/)
    assert.match(source, /name="heroicons:plus-solid"/)
    assert.doesNotMatch(source, /(?:fa-solid|material-symbols|pepicons-pop|si):|fa-solid-home/)
  }

  assert.match(monthSelector, /name="heroicons:calendar-days-solid"/)

  for (const iconName of shellIconNames) {
    assert.ok(heroicons.icons[iconName] || heroicons.aliases?.[iconName], `${iconName} must exist locally`)
  }
})
