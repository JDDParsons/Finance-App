<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const open = ref(false)

// Sorted descending so newest year appears first
const availableYears = computed(() =>
  [...new Set(store.availableMonths.map(m => m.year))].sort((a, b) => b - a)
)

const availableKeys = computed(() =>
  new Set(store.availableMonths.map(m => m.year * 100 + m.month))
)

function isAvailable(year: number, month: number) {
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

const label = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : ''
  return MONTHS_FULL[month - 1] + yearSuffix
})
</script>

<template>
  <div class="flex items-center justify-center py-2">
    <UPopover v-model:open="open">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="heroicons-solid:chevron-down"
        :loading="store.loading"
        class="drop-shadow font-semibold text-md"
      >
        {{ label }}
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
