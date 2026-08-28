<script setup lang="ts">
import { ref } from 'vue'
import {
    getBudgetErrorMessage,
    isInvalidBudgetAmountError,
} from '~/utils/budgetErrors'

const props = defineProps<{
    budgetId: string
    budgetAmount?: number
}>()

const emit = defineEmits<{
    update: []
    cancel: []
}>()

const store = useFinanceStore()

const amount = ref(props.budgetAmount ?? 0)

const loading = ref(false)
const error = ref<string | null>(null)
const amountError = ref<string | null>(null)

watch(amount, () => {
    amountError.value = null
})

async function handleUpdateBudget() {
    if (Number(amount.value) > 0) {
        try {
            loading.value = true
            error.value = null
            amountError.value = null
            await store.editBudgetPeriod(props.budgetId || '', amount.value.toString())
            emit('update')
        } catch (err: any) {
            if (isInvalidBudgetAmountError(err)) {
                amountError.value = 'Amount must be greater than 0.'
            } else {
                error.value = getBudgetErrorMessage(err, 'Error updating budget')
            }
            console.error('Error updating budget:', err)
        } finally {
            loading.value = false
        }
    } else {
        amountError.value = 'Amount must be greater than 0.'
    }
}

</script>

<template>
        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budget...</p>
        </div>

        <div v-else class="space-y-6">
            <p class="text-sm text-gray-500">This changes only the allocation for the selected month.</p>
            <UFormField label="Monthly allocation" :error="amountError" required>
                <UInput
                    v-model="amount"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    size="xl"
                />
            </UFormField>

            <div class="flex gap-3">
                <UButton
                    color="secondary"
                    @click="handleUpdateBudget"
                    class="flex-1"
                    :loading="loading"
                    :disabled="loading"
                >
                    Update allocation
                </UButton>
                <UButton
                    color="neutral"
                    variant="outline"
                    @click="emit('cancel')"
                    class="flex-1"
                    :disabled="loading"
                >
                    Cancel
                </UButton>
            </div>
        </div>
</template>
