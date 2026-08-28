<script setup lang="ts">
import { getBudgetErrorMessage, isDuplicateBudgetNameError } from '~/utils/budgetErrors'

const props = defineProps<{
  budgetId: string
  budgetName?: string
  budgetColor?: string
  budgetIcon?: string | null
}>()

const emit = defineEmits<{ update: []; cancel: [] }>()
const store = useFinanceStore()
const name = ref(props.budgetName ?? '')
const color = ref(props.budgetColor ?? '#6366f1')
const icon = ref<string | null>(props.budgetIcon ?? null)
const loading = ref(false)
const error = ref<string | null>(null)
const nameError = ref<string | null>(null)

watch(name, () => { nameError.value = null })

async function save() {
  if (!name.value.trim()) {
    nameError.value = 'Please enter a budget name.'
    return
  }
  try {
    loading.value = true
    error.value = null
    await store.editBudgetMetadata(props.budgetId, name.value, color.value, icon.value)
    emit('update')
  } catch (err: any) {
    if (isDuplicateBudgetNameError(err)) nameError.value = 'A budget with this name already exists.'
    else error.value = getBudgetErrorMessage(err, 'Unable to update shared budget details.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <UAlert
      title="Shared across all months"
      description="Changing the name, colour, or icon updates this budget everywhere it appears. Monthly allocations are not affected."
      color="warning"
      variant="soft"
    />
    <UAlert v-if="error" color="error" variant="soft" :description="error" />
    <UFormField label="Budget name" :error="nameError" required>
      <UInput v-model="name" size="xl" />
    </UFormField>
    <UFormField label="Colour"><BudgetsColorPicker v-model="color" /></UFormField>
    <UFormField label="Icon"><BudgetsChooseIcon v-model="icon" :color="color" /></UFormField>
    <div class="flex gap-3">
      <UButton class="flex-1" color="secondary" :loading="loading" :disabled="loading" @click="save">Update shared details</UButton>
      <UButton class="flex-1" color="neutral" variant="outline" :disabled="loading" @click="emit('cancel')">Cancel</UButton>
    </div>
  </div>
</template>
