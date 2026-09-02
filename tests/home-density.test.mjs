import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home dashboard uses compact spacing between and within cards', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')
  const gaugeNeedle = await readFile(new URL('../app/components/GaugeNeedle.vue', import.meta.url), 'utf8')
  const cumulativeChart = await readFile(new URL('../app/components/home/CumulativeSpendingChart.vue', import.meta.url), 'utf8')

  assert.match(homePage, /grid grid-cols-2 gap-3 pb-20 pt-3/)
  assert.match(homePage, /body: 'p-3 sm:p-4'/)
  assert.equal(homePage.match(/:ui="compactCardUi"/g)?.length, 6)
  assert.match(homePage, /\{\{ periodLabel \}\}/)
  assert.match(homePage, /donutIncome\.value\.amount - totalExpenses\.value/)
  assert.match(homePage, /totalExpenses\.value \/ Math\.max\(donutIncome\.value\.amount, 1\)/)
  assert.match(homePage, />Total expenses and income this month<\/h3>/)
  assert.match(homePage, /grid grid-cols-3 gap-2 text-center/)
  assert.doesNotMatch(homePage, /expenseMoMChange/)
  assert.match(homePage, /categoryLabels: \['Expenses', 'Remaining'\]/)
  assert.match(homePage, /data: \[totalExpenses\.value, chartRemaining\.value\]/)
  assert.match(homePage, /cutout: '78%'/)
  assert.equal(homePage.match(/borderWidth: 0/g)?.length, 2)
  assert.match(homePage, /onClick: toggleDonutTooltip/)
  assert.match(homePage, /dataset\.categoryLabels\?\.\[item\.dataIndex\]/)
  assert.match(homePage, /<Doughnut class="relative z-20"/)
  assert.equal(homePage.match(/h-\[200px\] w-full max-w-sm/g)?.length, 2)
  assert.doesNotMatch(homePage, /lg:h-\[300px\]/)
  assert.match(gaugeNeedle, /bottom-\[22px\]/)
  assert.doesNotMatch(gaugeNeedle, /lg:bottom/)
  assert.match(cumulativeChart, /h-44 lg:h-\[192px\]/)
})
