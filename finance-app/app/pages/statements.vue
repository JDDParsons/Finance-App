<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const rows = ref<{ year: number | null; month: string | null; name: string; transactions: number; rawGroup: string; dateUploaded: string | null }[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/statements')
    if (!res.ok) throw new Error(`Error fetching statements: ${res.statusText}`)
    const data = await res.json()
    rows.value = data || []
  } catch (err: any) {
    error.value = err.message || 'Failed to load statements'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <UHeader title="Statements" />

    <UMain>
      <UContainer>
        <div class="flex justify-start pt-6 mb-4">
          <UButton to="/upload" color="neutral" variant="outline" size="xl">Back to Upload</UButton>
        </div>
        <div class="mt-6">
          <div v-if="loading">Loading statements…</div>
          <div v-else-if="error">{{ error }}</div>
          <div v-else>
            <table class="w-full table-auto border-collapse">
              <thead>
                <tr class="text-left">
                  <th class="p-2 border">Year</th>
                  <th class="p-2 border">Month</th>
                  <th class="p-2 border">Institution / Account</th>
                  <th class="p-2 border">Number of transactions</th>
                  <th class="p-2 border">Date uploaded</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in rows" :key="idx">
                  <td class="p-2 border">{{ r.year ?? '-' }}</td>
                  <td class="p-2 border">{{ r.month ?? '-' }}</td>
                  <td class="p-2 border">{{ r.name }}</td>
                  <td class="p-2 border">{{ r.transactions }}</td>
                  <td class="p-2 border">{{ r.dateUploaded ? new Date(r.dateUploaded).toLocaleString() : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>
