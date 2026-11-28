import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('only the installed iOS app moves the header contents down', async () => {
  const css = await read('app/assets/css/main.css')

  assert.match(css, /:root \{\s+--header-drop: 0px;/)
  assert.match(css, /@supports \(-webkit-touch-callout: none\) \{\s+@media \(display-mode: standalone\) \{\s+:root \{\s+--header-drop: 0\.75rem;/)
  assert.match(css, /padding-top: calc\(env\(safe-area-inset-top\) \+ var\(--header-drop\)\)/)
  assert.match(css, /--ui-header-height: calc\(env\(safe-area-inset-top\) \+ 4rem \+ var\(--header-drop\)\)/)
})

test('what sits under the header allows for the taller header', async () => {
  const css = await read('app/assets/css/main.css')
  const sideNav = await read('app/components/SideNav.vue')

  assert.match(css, /@utility top-below-header \{[^}]*var\(--header-drop\)/)
  assert.match(css, /\[data-sync-notice\] \{[^}]*var\(--header-drop\)/)
  assert.match(sideNav, /top-\[calc\(var\(--ui-header-height\)\+var\(--header-drop\)\)\]/)
})

test('the bottom nav keeps clear of the home indicator', async () => {
  const css = await read('app/assets/css/main.css')
  const nav = await read('app/components/BottomNav.vue')

  assert.match(nav, /<nav class="[^"]*pb-safe/)
  // The class was once used without being defined, so it did nothing.
  assert.match(css, /@utility pb-safe \{[^}]*env\(safe-area-inset-bottom/)
})

test('the home chart keeps its stacking to itself, below the bottom nav', async () => {
  const homePage = await read('app/pages/home.vue')

  assert.match(homePage, /<div v-else class="relative isolate [^"]*">\s*<Doughnut class="relative z-20"/)
})
