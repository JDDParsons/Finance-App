<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgetHitsByBudgetId, signOut } from '../composables/supabase'

const props = defineProps<{
    budgetId: string
}>()

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
        hits.value = await getBudgetHitsByBudgetId(props.budgetId)
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
    <div v-if="error" class="mb-4">
        <UAlert
            title="Error"
            :description="error"
            color="error"
            variant="soft"
        />
    </div>

    <div v-if="loading" class="text-center py-12">
        <p class="text-gray-400">Loading budget hits...</p>
    </div>

    <div v-else-if="hits.length === 0" class="text-center py-12">
        <p class="text-gray-400">No budget hits recorded yet.</p>
    </div>

    <div v-else class="">
        <UCard class="w-full" :ui="{ body: 'min-h-0 flex flex-col' }">
            <template #header>
            <h2 class="text-2xl font-bold">Budget Hits</h2>
            </template>

            <!-- The flex-1 and min-h-0 here are key for iOS Safari -->
            <div class="flex-1 min-h-0">
            <UScrollArea class="max-h-96">
                <div class="space-y-4 p-1"> <!-- Added spacing for clarity -->
                <UCard v-for="hit in hits" :key="hit.id">
                    <div class="flex">
                    <div class="mr-5">
                        <p class="text-md font-semibold">{{ formatDate(hit.date) }}</p>
                    </div>
                    <div class="mr-5">
                        <p class="text-md font-bold text-info">{{ formatCurrency(hit.amount) }}</p>
                    </div>
                    </div>
                    <p class="text-md mt-0.75">{{ hit.note }}</p>
                </UCard>
                </div>
            </UScrollArea>
            </div>

            <template #footer>
            <div class="flex">
                <UButton color="neutral" variant="ghost" size="md" @click="$emit('cancel')">
                Cancel
                </UButton>
            </div>
            </template>
        </UCard>

        <!--
        <UCard
            v-for="hit in hits"
            :key="hit.id"
            class=""
        >
            <div class="flex">
                <div class="mr-5">
                    <p class="text-sm text-gray-500">Date</p>
                    <p class="text-lg font-semibold">{{ formatDate(hit.date) }}</p>
                </div>
                <div class="mr-5">
                    <p class="text-sm text-gray-500">Amount</p>
                    <p class="text-lg font-bold text-info">{{ formatCurrency(hit.amount) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Note</p>
                    <p class="text-md font-semibold mt-0.75">{{ hit.note }}</p>
                </div>
            </div>
        </UCard>
        -->
    </div>
</template>
