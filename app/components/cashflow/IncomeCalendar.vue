<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const today = new Date()

/** The month/year being displayed (driven by the store's selectedMonth). */
const year = computed(() => store.selectedMonth.year)
const month = computed(() => store.selectedMonth.month) // 1-based

/** Set of day-of-month numbers that have at least one income record. */
const incomeDays = computed<Set<number>>(() => {
  const set = new Set<number>()
  for (const row of store.income as any[]) {
    if (!row.date) continue
    // Avoid timezone shifts by parsing the date parts directly
    const [y, m, d] = (row.date as string).split('-').map(Number)
    if (y === year.value && m === month.value) {
      set.add(d)
    }
  }
  return set
})

/** Whether the displayed month is the real current month. */
const isCurrentMonth = computed(
  () => year.value === today.getFullYear() && month.value === today.getMonth() + 1
)

const todayDay = computed(() => isCurrentMonth.value ? today.getDate() : -1)

/**
 * Flat array of calendar cells.
 * Each cell is either null (empty padding) or a day number.
 */
const cells = computed<(number | null)[]>(() => {
  const firstDow = new Date(year.value, month.value - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  const result: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) result.push(d)
  // Pad to a full last row
  while (result.length % 7 !== 0) result.push(null)
  return result
})

const monthLabel = computed(() =>
  new Date(year.value, month.value - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
)
</script>

<template>
  <div class="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-4 mb-4">
    <!-- Month heading -->
    <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center mb-3">
      {{ monthLabel }}
    </p>

    <!-- Day-of-week headers -->
    <div class="grid grid-cols-7 mb-1">
      <span
        v-for="d in DAYS"
        :key="d"
        class="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 pb-1"
      >
        {{ d }}
      </span>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-y-1">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="flex items-center justify-center"
      >
        <!-- Empty padding cell -->
        <span v-if="cell === null" />

        <!-- Day cell -->
        <span
          v-else
          class="relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium select-none transition-colors"
          :class="[
            // Today ring — highest visual priority
            cell === todayDay
              ? 'ring-2 ring-primary-500 dark:ring-primary-400 text-primary-600 dark:text-primary-300 font-bold'
              : '',
            // Income day background
            incomeDays.has(cell) && cell !== todayDay
              ? 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold'
              : '',
            // Income + today combined
            incomeDays.has(cell) && cell === todayDay
              ? 'bg-emerald-500/20 dark:bg-emerald-500/25'
              : '',
            // Past days (before today in the current month) — dim slightly
            isCurrentMonth && cell < todayDay && !incomeDays.has(cell)
              ? 'text-gray-300 dark:text-gray-600'
              : '',
            // Future days or non-current-month days without income
            !incomeDays.has(cell) && cell !== todayDay && !(isCurrentMonth && cell < todayDay)
              ? 'text-gray-500 dark:text-gray-400'
              : '',
          ]"
        >
          {{ cell }}

          <!-- Income dot indicator -->
          <span
            v-if="incomeDays.has(cell)"
            class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
          />
        </span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-3 justify-center">
      <span class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span class="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/60 inline-block" />
        Income date
      </span>
      <span class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span class="w-3 h-3 rounded-full ring-2 ring-primary-500 inline-block" />
        Today
      </span>
    </div>
  </div>
</template>
