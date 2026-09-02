<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const props = defineProps<{
  transferId: string
  transferAmount: number | string
  transferDate: string
  fromAccountId: string
  toAccountId: string
}>()

const emit = defineEmits<{ update: []; cancel: [] }>()
const store = useFinanceStore()
const amount = ref(Number(props.transferAmount))
const date = ref(props.transferDate.slice(0, 10))
const selectedFromAccountId = ref(props.fromAccountId)
const selectedToAccountId = ref(props.toAccountId)
const loading = ref(false)
const error = ref<string | null>(null)

const accountOptions = computed(() => store.accounts.map((account: any) => ({
  label: account.name || account.institution || 'Account',
  value: account.id,
})))

function validateForm() {
  if (!selectedFromAccountId.value || !selectedToAccountId.value) return 'Select both accounts.'
  if (selectedFromAccountId.value === selectedToAccountId.value) return 'Source and destination accounts must be different.'
  if (!Number.isFinite(Number(amount.value)) || Number(amount.value) <= 0) return 'Transfer amount must be greater than zero.'
  if (!date.value) return 'Select a transfer date.'
  return null
}

async function handleUpdate() {
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  try {
    loading.value = true
    error.value = null
    await store.updateTransfer(
      props.transferId,
      selectedFromAccountId.value,
      selectedToAccountId.value,
      Number(amount.value),
      date.value
    )
    emit('update')
  } catch (err: any) {
    error.value = err?.message || 'Error updating transfer'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="error" class="mb-4">
    <UAlert title="Error" :description="error" color="error" variant="soft" />
  </div>

  <div class="space-y-6">
    <UFormField label="Transfer from" required>
      <USelect v-model="selectedFromAccountId" :items="accountOptions" size="xl" color="info" class="w-full" />
    </UFormField>

    <UFormField label="Transfer to" required>
      <USelect v-model="selectedToAccountId" :items="accountOptions" size="xl" color="info" class="w-full" />
    </UFormField>

    <UAlert
      v-if="selectedFromAccountId === selectedToAccountId"
      color="error"
      description="Source and destination accounts must be different."
    />

    <UFormField label="Amount" required>
      <UInput v-model="amount" type="number" min="0.01" step="0.01" size="xl" color="info" class="w-full" />
    </UFormField>

    <UFormField label="Date" required>
      <UInput v-model="date" type="date" size="xl" color="info" class="w-full" />
    </UFormField>

    <div class="flex gap-3">
      <UButton class="flex-1 justify-center" color="secondary" :loading="loading" :disabled="loading" @click="handleUpdate">
        Update Transfer
      </UButton>
      <UButton class="flex-1 justify-center" color="neutral" variant="ghost" :disabled="loading" @click="emit('cancel')">
        Cancel
      </UButton>
    </div>
  </div>
</template>
