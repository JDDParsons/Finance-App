<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getIncome, deleteIncome } from '../composables/supabase'

const incomeRows = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  await refresh()
})

async function refresh() {
  try {
    loading.value = true
    error.value = null
    incomeRows.value = await getIncome()
  } catch (err: any) {
    error.value = err?.message || 'Failed to load income'
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this income record?')) return
  try {
    await deleteIncome(id)
    incomeRows.value = incomeRows.value.filter(r => r.id !== id)
  } catch (err: any) {
    alert('Error deleting income: ' + (err?.message || 'Unknown error'))
  }
}

function formatDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatAmount(val: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val)
}

function isFuture(val: string | null) {
  if (!val) return false
  return new Date(val) > new Date()
}

defineExpose({ refresh })
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="error" color="error" :description="error" />

    <div v-else-if="incomeRows.length === 0" class="text-center text-gray-400 py-16">
      No income records yet. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <UCard v-for="row in incomeRows" :key="row.id">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1 flex-1">
            <div class="flex items-center gap-2">
              <span
                class="text-xl font-semibold"
                :class="isFuture(row.date) ? 'text-gray-400' : 'text-primary-500'"
              >{{ formatAmount(row.amount) }}</span>
              <UBadge v-if="isFuture(row.date)" color="neutral" variant="subtle" class="ml-auto">Scheduled</UBadge>
            </div>
            <span class="text-sm text-gray-500">{{ formatDate(row.date) }}</span>
            <span v-if="row.note" class="text-sm text-gray-600 dark:text-gray-300">{{ row.note }}</span>
          </div>
          <UButton
            icon="heroicons-solid:trash"
            color="error"
            variant="ghost"
            size="sm"
            @click="handleDelete(row.id)"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
