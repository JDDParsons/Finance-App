<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()
const incomeRows = computed(() => store.income)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)

async function handleDelete(id: string) {
  if (!confirm('Delete this income record?')) return
  try {
    await store.removeIncome(id)
  } catch (err: any) {
    alert('Error deleting income: ' + (err?.message || 'Unknown error'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <!-- Income calendar -->
    <CashflowIncomeCalendar />

    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="incomeRows.length === 0" class="text-center text-gray-400 py-16">
      No income records yet. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <CashflowIncomeCard
        v-for="row in incomeRows"
        :key="row.id"
        :id="row.id"
        :amount="row.amount"
        :date="row.date"
        :note="row.note"
        :account-name="row.account_id ? accountMap.get(row.account_id) ?? null : null"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>
