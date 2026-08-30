<script setup lang="ts">
const props = defineProps<{ budgetId: string; records: any[] }>()
const emit = defineEmits<{ update: [] }>()
const store = useFinanceStore()
const selected = ref<any>(null)
const open = ref(false)
const accountMap = computed(() => new Map(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account'])))

function edit(id: string) {
  selected.value = props.records.find(row => row.id === id) ?? null
  open.value = Boolean(selected.value)
}

async function remove(id: string) {
  if (!confirm('Delete this income record?')) return
  await store.removeIncome(id)
  emit('update')
}

function close() {
  open.value = false
  selected.value = null
  emit('update')
}
</script>

<template>
  <section>
    <h2 class="mb-4 text-xl font-bold">Income records</h2>
    <p v-if="!records.length" class="py-8 text-center text-gray-400">No income has been assigned to this budget.</p>
    <div v-else class="flex flex-col gap-3">
      <CashflowIncomeCard
        v-for="row in records"
        :key="row.id"
        :id="row.id"
        :amount="row.amount"
        :date="row.date"
        :entity="row.entity"
        :account-name="row.account_id ? accountMap.get(row.account_id) ?? null : null"
        @edit="edit"
        @delete="remove"
      />
    </div>
  </section>

  <UModal v-if="selected" v-model:open="open" @update:open="value => { if (!value) close() }">
    <template #content>
      <UCard>
        <template #header><h2 class="text-2xl font-bold">Edit Income</h2></template>
        <IncomeEdit
          :income-id="selected.id"
          :income-amount="selected.amount"
          :income-date="selected.date"
          :income-entity="selected.entity"
          :income-budget-id="selected.budget_id"
          :income-account-id="selected.account_id"
          @update="close"
          @cancel="close"
          @delete="close"
        />
      </UCard>
    </template>
  </UModal>
</template>
