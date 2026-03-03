<script setup lang="ts">
import { createBudgetHit } from '../composables/supabase'

const props = defineProps<{
    budgetId: string,
    budgetName?: string
}>()

const emit = defineEmits<{
    cancel: []
}>()

function handleCancel() {
    emit('cancel')
}

const localDate = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD
const date = ref(localDate);
const amount = ref('')
const note = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

function validateForm() {
    if (!date.value) {
        alert('Please select a date')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleCreateHit() {
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            await createBudgetHit(props.budgetId, date.value, amount.value, note.value)
            emit('cancel') // Close the modal after successful creation
        } catch (err: any) {
            error.value = err?.message || 'Error recording budget hit'
            console.error('Error creating budget hit:', err)
            alert(error.value)
        } finally {
            loading.value = false
        }
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <div>
                <h2 class="text-2xl font-bold">{{budgetName}}</h2>
                <p class="text-gray-500 mt-2">Record an expense for this budget</p>
            </div>
        </template>
        
        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div class="space-y-6">
            <UFormField label="Amount" required>
                <UInput
                    v-model="amount"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    size="xl"
                />
            </UFormField>

            <UFormField label="Date" required>
                <UInput
                    v-model="date"
                    type="date"
                    size="xl"
                />
            </UFormField>
            
            <UFormField label="Note">
                <UInput
                    v-model="note"
                    placeholder="Leave a note..."
                    type="text"
                    size="xl"
                />
            </UFormField>

            <UButton
                color="info"
                variant="solid"
                @click="handleCreateHit"
                class="flex-1 mt-2"
                :disabled="loading"
                :loading="loading"
            >
                Submit expense
            </UButton>
        </div>

        <template #footer>
            <div class="flex gap-4">

                <UButton
                    color="neutral"
                    variant="ghost"
                    @click="handleCancel"
                    class="w-16"
                    :disabled="loading"
                >
                    Cancel
                </UButton>
            </div>
        </template>
    </UCard>
</template>
