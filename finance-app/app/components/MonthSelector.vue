<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const props = withDefaults(defineProps<{
  iconOnly?: boolean
  plain?: boolean
}>(), {
  iconOnly: false,
  plain: false
})

const store = useFinanceStore()

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const open = ref(false)

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

// Sorted descending so newest year appears first; always include the current year
const availableYears = computed(() => {
  const years = new Set(store.availableMonths.map(m => m.year))
  years.add(currentYear)
  return [...years].sort((a, b) => b - a)
})

const availableKeys = computed(() =>
  new Set(store.availableMonths.map(m => m.year * 100 + m.month))
)

function isAvailable(year: number, month: number) {
  // The current calendar month is always selectable even if it has no data yet
  if (year === currentYear && month === currentMonth) return true
  return availableKeys.value.has(year * 100 + month)
}

function isSelected(year: number, month: number) {
  return store.selectedMonth.year === year && store.selectedMonth.month === month
}

function selectMonth(year: number, month: number) {
  if (!isAvailable(year, month)) return
  store.setMonth(year, month)
  open.value = false
}

const monthLabel = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : ''
  return MONTHS_FULL[month - 1] + yearSuffix
})

const relativeHeading = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth()
  const selectedMonthIndex = year * 12 + (month - 1)
  const monthDiff = currentMonthIndex - selectedMonthIndex

  if (monthDiff <= 0) return 'This month'
  if (monthDiff === 1) return 'Previous month'
  return `${monthDiff} months ago`
})
</script>

<template>
  <div class="inline-flex items-center">
    <UPopover v-model:open="open">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="store.loading"
        :class="props.plain
          ? ''
          : props.iconOnly
          ? 'inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/90 p-3 text-gray-600 shadow-lg shadow-black/10 backdrop-blur transition-colors hover:text-primary-500 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:text-primary-400'
          : 'drop-shadow'"
        :aria-label="`Select month: ${monthLabel} (${relativeHeading})`"
        :title="`${monthLabel} (${relativeHeading})`"
      >
        <UIcon v-if="(props.iconOnly || props.plain) && !store.loading" name="heroicons-solid:calendar-days" class="size-6" />
        <div v-if="!props.iconOnly && !props.plain" class="flex flex-col items-center leading-tight px-3 py-2">
          <span class="text-xl font-semibold text-highlighted">
            {{ relativeHeading }}
          </span>
          <span class="text-lg text-muted">
            {{ monthLabel }}
          </span>
        </div>
      </UButton>

      <template #content>
        <div class="p-3 space-y-4 min-w-48">
          <div v-for="year in availableYears" :key="year">
            <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {{ year }}
            </p>
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="(abbr, idx) in MONTHS_ABBR"
                :key="idx"
                :disabled="!isAvailable(year, idx + 1)"
                :class="[
                  'rounded px-2 py-1 text-sm transition-colors',
                  isSelected(year, idx + 1)
                    ? 'bg-primary-500 text-white font-semibold'
                    : isAvailable(year, idx + 1)
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed'
                ]"
                @click="selectMonth(year, idx + 1)"
              >
                {{ abbr }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
