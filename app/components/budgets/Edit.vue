<script setup lang="ts">
import { ref } from 'vue'
import {
    isDuplicateBudgetNameError,
    getBudgetErrorMessage,
    isInvalidBudgetAmountError,
} from '~/utils/budgetErrors'

const props = defineProps<{
    budgetId: string
    budgetName?: string
    budgetAmount?: number
    budgetColor?: string
    budgetIcon?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
}>()

const store = useFinanceStore()
const { monthTitle } = useSelectedMonthTitle()

const name = ref(props.budgetName ?? '')
const amount = ref(props.budgetAmount ?? 0)
const color = ref(props.budgetColor ?? '#6366f1')
const icon = ref<string | null>(props.budgetIcon ?? null)

const loading = ref(false)
const error = ref<string | null>(null)
const nameError = ref<string | null>(null)
const amountError = ref<string | null>(null)

watch(name, () => {
    nameError.value = null
})

watch(amount, () => {
    amountError.value = null
})

async function handleUpdateBudget() {
    if (!name.value.trim()) {
        nameError.value = 'Please enter a budget name.'
        return
    }
    if (!(Number(amount.value) > 0)) {
        amountError.value = 'Amount must be greater than 0.'
        return
    }

    try {
        loading.value = true
        error.value = null
        nameError.value = null
        amountError.value = null
        await store.editBudgetPeriod(props.budgetId, amount.value.toString())
        await store.editBudgetMetadata(props.budgetId, name.value, color.value, icon.value)
        emit('update')
    } catch (err: any) {
        if (isDuplicateBudgetNameError(err)) {
            nameError.value = 'A budget with this name already exists.'
        } else if (isInvalidBudgetAmountError(err)) {
            amountError.value = 'Amount must be greater than 0.'
        } else {
            error.value = getBudgetErrorMessage(err, 'Unable to update this budget.')
        }
        console.error('Error updating budget:', err)
    } finally {
        loading.value = false
    }
}

</script>

<template>
    <LoadingOverlay :visible="loading" label="Updating budget…" />

    <div v-if="error" class="mb-4">
        <UAlert
            title="Error"
            :description="error"
            color="error"
            variant="soft"
        />
    </div>

    <div class="space-y-6">
        <UFormField label="Budget name" :error="nameError" required>
            <UInput v-model="name" size="xl" />
        </UFormField>
        <UFormField :label="`Allocation for ${monthTitle}`" :error="amountError" required>
            <UInput
                v-model="amount"
                placeholder="0.00"
                type="number"
                step="0.01"
                size="xl"
            />
        </UFormField>
        <UFormField label="Colour"><BudgetsColorPicker v-model="color" /></UFormField>
        <UFormField label="Icon"><BudgetsChooseIcon v-model="icon" :color="color" /></UFormField>

        <div class="flex gap-3">
            <UButton
                color="primary"
                class="flex-1"
                :disabled="loading"
                @click="handleUpdateBudget"
            >
                Save changes
            </UButton>
            <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                :disabled="loading"
                @click="emit('cancel')"
            >
                Cancel
            </UButton>
        </div>
    </div>
</template>
