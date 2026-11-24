<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { accountDisplayName } from '../../../utils/accountAppearance'

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const budgetColorMap = computed(() =>
  new Map<string, string | null>(store.budgets.map((b: any) => [b.id, b.color ?? null]))
)

const budgetIconMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.icon ?? budgetIcon(b.name)]))
)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, accountDisplayName(a)]))
)

const accountInstitutionMap = computed(() =>
  new Map<string, string | null>(store.accounts.map((a: any) => [a.id, a.institution ?? null]))
)

const expenses = computed(() => store.budgetHits)

function toDateKey(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateSubheader(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(dateFromKey(dateKey))
}

const dailyExpenseSections = computed(() => {
  const groups = new Map<string, any[]>()

  for (const expense of expenses.value) {
    const dateKey = toDateKey(expense.date)
    if (!dateKey) continue

    const items = groups.get(dateKey) ?? []
    items.push(expense)
    groups.set(dateKey, items)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = localDateKey(today)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = localDateKey(yesterday)

  return Array.from(groups.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, items]) => {
      let title = dateFromKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' })
      if (dateKey === todayKey) title = 'Today'
      if (dateKey === yesterdayKey) title = 'Yesterday'

      return {
        key: dateKey,
        title,
        dateLabel: formatDateSubheader(dateKey),
        items
      }
    })
})

const now = new Date()
const isCurrentMonth = computed(() =>
  store.selectedMonth.year === now.getFullYear() &&
  store.selectedMonth.month === now.getMonth() + 1
)

// Tapping a card expands it in place so its fields can be edited. One card at a time.
const expandedId = ref<string | null>(null)

function setExpanded(id: string, open: boolean) {
  if (open) expandedId.value = id
  else if (expandedId.value === id) expandedId.value = null
}

</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="expenses.length === 0" class="text-center text-gray-400 py-16">
      No expenses recorded for this month. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <CashflowSevenDayExpenses v-if="isCurrentMonth" :expenses="expenses" />
      <div class="flex flex-col gap-4">
        <section v-for="section in dailyExpenseSections" :key="section.key" class="flex flex-col gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>
            <p class="text-xs text-gray-500">{{ section.dateLabel }}</p>
          </div>
          <div v-for="hit in section.items" :key="hit.id">
            <ExpenseCard
              :expense-id="hit.id"
              :expanded="expandedId === hit.id"
              @update:expanded="setExpanded(hit.id, $event)"
            />
            <p v-if="hit.pending_sync || hit.sync_error" class="mt-1 text-right text-xs" :class="hit.sync_error ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'">
              {{ hit.sync_error || 'Waiting to sync' }}
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>

</template>
