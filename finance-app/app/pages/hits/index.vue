<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgetHits, signOut } from '../../composables/supabase'

const router = useRouter()
const hits = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
        return dateString
    }
}

function formatCurrency(value: number | null) {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

async function fetchHits() {
    try {
        loading.value = true
        error.value = null
        hits.value = await getBudgetHitsByBudgetId()
    } catch (err: any) {
        error.value = err?.message || 'Failed to load budget hits'
        console.error('Error fetching budget hits:', err)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchHits()
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
                <div class="flex justify-between items-center mt-8 mb-8">
                    <h1 class="text-3xl font-bold">Budget Hits</h1>
                    <UButton color="blue" variant="ghost" @click="router.back()">Back</UButton>
                </div>

                <div v-if="error" class="mb-4">
                    <UAlert
                        title="Error"
                        :description="error"
                        color="red"
                        variant="soft"
                    />
                </div>

                <div v-if="loading" class="text-center py-12">
                    <p class="text-gray-400">Loading budget hits...</p>
                </div>

                <div v-else-if="hits.length === 0" class="text-center py-12">
                    <p class="text-gray-400">No budget hits recorded yet.</p>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <UCard
                        v-for="hit in hits"
                        :key="hit.id"
                        class="flex flex-col"
                    >
                        <template #header>
                            <div class="space-y-1">
                                <p class="text-sm text-gray-500">Date</p>
                                <p class="text-lg font-semibold">{{ formatDate(hit.date) }}</p>
                            </div>
                        </template>
                        
                        <div class="space-y-3 flex-1">
                            <div>
                                <p class="text-sm text-gray-500">Amount</p>
                                <p class="text-2xl font-bold text-primary">{{ formatCurrency(hit.amount) }}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Budget ID</p>
                                <p class="text-sm font-mono text-gray-600">{{ hit.budget_id }}</p>
                            </div>
                        </div>
                    </UCard>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>
