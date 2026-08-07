<script setup lang="ts">
const props = defineProps<{
    incomeId: string
    incomeAmount?: number
    incomeDate?: string
    incomeEntity?: string | null
    incomeAccountId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()

const amount = ref(props.incomeAmount ?? 0)
const date = ref(props.incomeDate ? props.incomeDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const entity = ref(props.incomeEntity ?? '')

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const immutableAccountId = computed<string | null>(() => {
    if (props.incomeAccountId !== undefined) return props.incomeAccountId
    const row = store.income.find((r: any) => r.id === props.incomeId)
    return row?.account_id ?? null
})

const selectedAccountId = ref<string>(immutableAccountId.value ?? '__none__')

const accountOptions = computed(() => [
    { label: 'No account', value: '__none__' },
    ...store.accounts.map((a: any) => ({
        label: a.name || a.institution || 'Account',
        value: a.id,
    }))
])

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

async function handleUpdate() {
    if (!validateForm()) return
    try {
        loading.value = true
        error.value = null
        await store.updateIncome(
            props.incomeId,
            Number(amount.value),
            date.value,
            entity.value,
            selectedAccountId.value === '__none__' ? null : selectedAccountId.value
        )
        emit('update')
    } catch (err: any) {
        error.value = err?.message || 'Error updating income'
        console.error('Error updating income:', err)
    } finally {
        loading.value = false
    }
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this income record? This action cannot be undone.')) return
    try {
        deleting.value = true
        error.value = null
        await store.removeIncome(props.incomeId)
        emit('delete')
    } catch (err: any) {
        error.value = err?.message || 'Error deleting income'
        console.error('Error deleting income:', err)
        deleting.value = false
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

    <div class="space-y-6">
        <UFormField label="Amount" required>
            <UInput
                v-model="amount"
                highlight
                color="info"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                size="xl"
            />
        </UFormField>

        <UFormField label="Date" required>
            <UInput
                v-model="date"
                highlight
                color="info"
                type="date"
                size="xl"
            />
        </UFormField>

        <UFormField label="Payer">
            <UInput
                v-model="entity"
                highlight
                color="info"
                placeholder="Enter a payer..."
                type="text"
                size="xl"
            />
        </UFormField>

        <UFormField label="Account">
            <USelect
                v-model="selectedAccountId"
                :items="accountOptions"
                size="xl"
                color="info"
                style="min-width: 200px;"
            />
        </UFormField>

        <div class="flex gap-3">
            <UButton
                color="secondary"
                class="flex-1 justify-center"
                @click="handleUpdate"
                :loading="loading"
                :disabled="loading || deleting"
            >
                Update Income
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                class="flex-1 justify-center"
                @click="emit('cancel')"
                :disabled="loading || deleting"
            >
                Cancel
            </UButton>
        </div>
    </div>
</template>
