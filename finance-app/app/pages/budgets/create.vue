<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createBudget, signOut } from '../../composables/supabase'

const router = useRouter()

const budgetName = ref('')
const startDate = ref('')
const endDate = ref('')
const amount = ref('')
const loading = ref(false)

function validateForm() {
    if (!budgetName.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleCreateBudget() {
    if (validateForm()) {
        try {
            loading.value = true
            await createBudget(budgetName.value, amount.value)
            await router.push('/budgets')
        } catch (error) {
            alert('Error creating budget: ' + (error?.message || 'Unknown error'))
        } finally {
            loading.value = false
        }
    }
}
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
                            <h2 class="text-2xl font-bold">Create New Budget</h2>
                        </template>
                        
                        <div class="space-y-6">
                            <UFormField label="Budget Name" required>
                                <UInput
                                    v-model="budgetName"
                                    placeholder="e.g., Monthly Groceries"
                                    type="text"
                                    size="xl"
                                />
                            </UFormField>

                            <UFormField label="Amount" required>
                                <UInput
                                    v-model="amount"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    size="xl"
                                />
                            </UFormField>
                        </div>

                        <template #footer>
                            <div class="flex gap-4">
                                <UButton
                                    color="primary"
                                    @click="handleCreateBudget"
                                    class="flex-1"
                                    :loading="loading"
                                    :disabled="loading"
                                >
                                    Create Budget
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
