<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getBudgetById, createBudgetHit, signOut } from '../../../composables/supabase'

const router = useRouter()
const route = useRoute()
const budgetId = route.params.id as string

const budgetName = ref('')
const date = ref(new Date().toISOString().split('T')[0]) // Default to today's date in YYYY-MM-DD format
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

async function fetchBudgetName() {
    try {
        loading.value = true
        error.value = null
        const budget = await getBudgetById(budgetId)
        budgetName.value = budget.name
    } catch (err: any) {
        error.value = err?.message || 'Failed to load budget'
        console.error('Error fetching budget:', err)
    } finally {
        loading.value = false
    }
}

async function handleCreateHit() {
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            await createBudgetHit(budgetId, date.value, amount.value, note.value)
            await router.push('/budgets')
        } catch (err: any) {
            error.value = err?.message || 'Error recording budget hit'
            console.error('Error creating budget hit:', err)
        } finally {
            loading.value = false
        }
    }
}

onMounted(() => {
    fetchBudgetName()
})
</script>

<template>
    <div>
        <UHeader title="Finance App">
          <template #right>
            <UColorModeSwitch />
            <UButton class="ml-2" color="neutral" variant="ghost" size="sm" @click="signOut()">Sign out</UButton>
          </template>
        </UHeader>
        <UMain>
            <UContainer>
                <div class="max-w-xl mx-auto mt-8">
                    <UCard>
                        <template #header>
                            <div>
                                <h2 class="text-2xl font-bold">Record Budget Hit</h2>
                                <p v-if="budgetName" class="text-gray-500 mt-2">Budget: {{ budgetName }}</p>
                            </div>
                        </template>
                        
                        <div v-if="error" class="mb-4">
                            <UAlert
                                title="Error"
                                :description="error"
                                color="red"
                                variant="soft"
                            />
                        </div>

                        <div class="space-y-6">
                            <UFormField label="Date" required>
                                <UInput
                                    v-model="date"
                                    type="date"
                                />
                            </UFormField>

                            <UFormField label="Amount" required>
                                <UInput
                                    v-model="amount"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                />
                            </UFormField>

                            
                            <UFormField label="Note" required>
                                <UInput
                                    v-model="note"
                                    placeholder="Leave a note..."
                                    type="text"
                                />
                            </UFormField>
                        </div>

                        <template #footer>
                            <div class="flex gap-4">
                                <UButton
                                    color="primary"
                                    @click="handleCreateHit"
                                    class="flex-1"
                                    :loading="loading"
                                    :disabled="loading"
                                >
                                    Record Hit
                                </UButton>
                                <UButton
                                    color="gray"
                                    @click="router.back()"
                                    class="flex-1"
                                    :disabled="loading"
                                >
                                    Cancel
                                </UButton>
                            </div>
                        </template>
                    </UCard>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>
