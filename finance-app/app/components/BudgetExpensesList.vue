<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgetHitsByBudgetId, deleteBudgetHit } from '../composables/supabase'

const props = defineProps<{
    budgetId: string
}>()

const hits = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const emit = defineEmits<{
    update: [],
    cancel: []
}>()

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
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

async function handleDeleteHit(id: string) {
    if (!confirm('Are you sure you want to delete this budget hit?')) return
    try {
        await deleteBudgetHit(id)
        await fetchHits() // Refresh the list after deletion
        emit('update') // Notify parent to refresh the budget hits list
        const numberOfHits = hits.value.length
        if (numberOfHits === 0) {
            emit('cancel') // Close the modal after deletion
        }
    } catch (err: any) {
        alert(err?.message || 'Failed to delete budget hit')
        console.error('Error deleting budget hit:', err)
    }
}   

onMounted(() => {
    fetchHits()
})
</script>

<template>
    <div class="h-100"> 
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
            <!-- The flex-1 and min-h-0 here are key for iOS Safari -->
            <div class="flex-1 min-h-0">
            <UScrollArea class="max-h-96">
                <div class="space-y-4 p-1"> <!-- Added spacing for clarity -->
                <UCard v-for="hit in hits" :key="hit.id" class="ml-2 mr-2">
                    <div>
                        <div class="flex">
                            <div class="mr-5">
                                <p class="text-sm font-semibold">{{ formatDate(hit.date) }}</p>
                            </div>
                            <div class="mr-5">
                                <p class="text-sm font-bold text-info">{{ formatCurrency(hit.amount) }}</p>
                            </div>
                            <UButton
                                color="error"
                                variant="ghost"
                                size="sm"
                                class="ml-auto"
                                @click="() => handleDeleteHit(hit.id)"
                            >
                                Remove  
                            </UButton>
                        </div>
                        <p class="text-sm mt-0.75">{{ hit.note }}</p>
                    </div>
                </UCard>
                </div>
            </UScrollArea>
            </div>
        </div>
    </div>
</template>

