<script setup lang="ts">
import { ref, onMounted } from 'vue'
const props = defineProps<{ year: number; month: number }>()

const loading = ref(true)
const transactions = ref<any[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch(`/api/report?year=${props.year}&month=${props.month}`)
    if (!res.ok) throw new Error(`Error fetching report: ${res.statusText}`)
    const data = await res.json()
    transactions.value = data || []
  } catch (err: any) {
    error.value = err.message || 'Failed to load report'
  } finally {
    loading.value = false
  }
})

const numTransactions = () => transactions.value.length
const sumAmounts = () => {
  return transactions.value.reduce((acc, t) => {
    const amt = t.amount == null ? 0 : Number(String(t.amount))
    return acc + (isNaN(amt) ? 0 : amt)
  }, 0)
}
</script>

<template>
  <div>
    <div v-if="loading">Loading report…</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <table class="w-full table-auto border-collapse">
        <thead>
          <tr class="text-left">
            <th class="p-2 border">Metric</th>
            <th class="p-2 border">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-2 border">Number of transactions</td>
            <td class="p-2 border">{{ numTransactions() }}</td>
          </tr>
          <tr>
            <td class="p-2 border">Sum of amounts</td>
            <td class="p-2 border">{{ sumAmounts().toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
