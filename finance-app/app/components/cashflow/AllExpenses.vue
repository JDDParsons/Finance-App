<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const budgetColorMap = computed(() =>
  new Map<string, string | null>(store.budgets.map((b: any) => [b.id, b.color ?? null]))
)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)

const accountInstitutionMap = computed(() =>
  new Map<string, string | null>(store.accounts.map((a: any) => [a.id, a.institution ?? null]))
)

const expenses = computed(() => store.budgetHits)

function toDateKey(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatDateSubheader(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

function formatDateRange(start: Date, end: Date) {
  return `${formatDateSubheader(start)} - ${formatDateSubheader(end)}`
}

const sevenDayExpenseSections = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const trailingDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - index)
    return day
  })

  return trailingDays
    .map((day, index) => {
      const dateKey = day.toISOString().slice(0, 10)
      const dayExpenses = expenses.value.filter((hit: any) => toDateKey(hit.date) === dateKey)

      let title = day.toLocaleDateString('en-US', { weekday: 'long' })
      if (index === 0) title = 'Today'
      if (index === 1) title = 'Yesterday'

      return {
        key: dateKey,
        title,
        dateLabel: formatDateSubheader(day),
        items: dayExpenses
      }
    })
    .filter(section => section.items.length > 0)
})

const overWeekAgoSection = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDayStart = new Date(today)
  sevenDayStart.setDate(today.getDate() - 6)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const olderRangeEnd = new Date(sevenDayStart)
  olderRangeEnd.setDate(sevenDayStart.getDate() - 1)

  if (olderRangeEnd < monthStart) return null

  const items = expenses.value.filter((hit: any) => {
    const key = toDateKey(hit.date)
    return key >= monthStart.toISOString().slice(0, 10) && key <= olderRangeEnd.toISOString().slice(0, 10)
  })

  if (items.length === 0) return null

  return {
    key: 'over-week-ago',
    title: 'Over a week ago',
    dateLabel: formatDateRange(monthStart, olderRangeEnd),
    items
  }
})

const now = new Date()
const isCurrentMonth = computed(() =>
  store.selectedMonth.year === now.getFullYear() &&
  store.selectedMonth.month === now.getMonth() + 1
)

const sortedExpenses = computed(() =>
  [...expenses.value].sort((a: any, b: any) => {
    const da = toDateKey(a.date)
    const db = toDateKey(b.date)
    return da < db ? 1 : da > db ? -1 : 0
  })
)

const selectedExpense = ref<any>(null)
const isEditingExpense = ref(false)

function handleEdit(id: string) {
  selectedExpense.value = expenses.value.find((h: any) => h.id === id) ?? null
  if (selectedExpense.value) isEditingExpense.value = true
}

function handleEditClose() {
  isEditingExpense.value = false
  selectedExpense.value = null
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await store.removeExpense(id)
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
  }
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
      <template v-if="isCurrentMonth">
        <CashflowSevenDayExpenses :expenses="expenses" />
        <div class="flex flex-col gap-4">
          <section v-for="section in sevenDayExpenseSections" :key="section.key" class="flex flex-col gap-2">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>
              <p class="text-xs text-gray-500">{{ section.dateLabel }}</p>
            </div>
            <ExpenseCard
              v-for="hit in section.items"
              :key="hit.id"
              :id="hit.id"
              :amount="hit.amount"
              :date="hit.date"
              :note="hit.note"
              :budget-name="budgetMap.get(hit.budget_id)"
              :budget-color="hit.budget_id ? budgetColorMap.get(hit.budget_id) ?? null : null"
              :account-name="hit.account_id ? accountMap.get(hit.account_id) ?? null : null"
              :account-institution="hit.account_id ? accountInstitutionMap.get(hit.account_id) ?? null : null"
              @delete="handleDelete"
              @edit="handleEdit"
            />
          </section>

          <section v-if="overWeekAgoSection" :key="overWeekAgoSection.key" class="flex flex-col gap-2">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ overWeekAgoSection.title }}</h3>
              <p class="text-xs text-gray-500">{{ overWeekAgoSection.dateLabel }}</p>
            </div>
            <ExpenseCard
              v-for="hit in overWeekAgoSection.items"
              :key="hit.id"
              :id="hit.id"
              :amount="hit.amount"
              :date="hit.date"
              :note="hit.note"
              :budget-name="budgetMap.get(hit.budget_id)"
              :budget-color="hit.budget_id ? budgetColorMap.get(hit.budget_id) ?? null : null"
              :account-name="hit.account_id ? accountMap.get(hit.account_id) ?? null : null"
              :account-institution="hit.account_id ? accountInstitutionMap.get(hit.account_id) ?? null : null"
              @delete="handleDelete"
              @edit="handleEdit"
            />
          </section>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-2">
          <ExpenseCard
            v-for="hit in sortedExpenses"
            :key="hit.id"
            :id="hit.id"
            :amount="hit.amount"
            :date="hit.date"
            :note="hit.note"
            :budget-name="budgetMap.get(hit.budget_id)"
            :budget-color="hit.budget_id ? budgetColorMap.get(hit.budget_id) ?? null : null"
            :account-name="hit.account_id ? accountMap.get(hit.account_id) ?? null : null"
            :account-institution="hit.account_id ? accountInstitutionMap.get(hit.account_id) ?? null : null"
            @delete="handleDelete"
            @edit="handleEdit"
          />
        </div>
      </template>
    </div>
  </div>

  <UModal v-if="selectedExpense" v-model:open="isEditingExpense" @update:open="(val) => { if (!val) handleEditClose() }">
    <template #content>
      <UCard>
        <template #header>
          <h2 class="text-2xl font-bold">Edit Expense</h2>
        </template>
        <ExpenseEdit
          :expense-id="selectedExpense.id"
          :expense-amount="selectedExpense.amount"
          :expense-date="selectedExpense.date"
          :expense-note="selectedExpense.note"
          :expense-budget-id="selectedExpense.budget_id"
          :expense-account-id="selectedExpense.account_id ?? null"
          @update="handleEditClose"
          @cancel="handleEditClose"
          @delete="handleEditClose"
        />
      </UCard>
    </template>
  </UModal>
</template>
