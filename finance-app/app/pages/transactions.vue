<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const loading = ref(true)
const rows = ref<any[]>([])
const error = ref<string | null>(null)

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatAmount(val: any) {
  if (val == null || val === '') return '-'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return currencyFormatter.format(n)
}

function formatDateOnly(val: any) {
  if (!val) return '-'
  // If the server returned an ISO date/time for a date-only DB value
  // (e.g. "2025-12-01T00:00:00.000Z"), extract the date portion
  // and construct a local Date so the local date matches the DB date.
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})(?:T.*Z)?$/)
    if (m) {
      const [y, mm, dd] = m[1].split('-').map(Number)
      const local = new Date(y, mm - 1, dd)
      if (!Number.isNaN(local.getTime())) return local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return String(val)
    }
  }

  const dObj = new Date(val)
  if (Number.isNaN(dObj.getTime())) return String(val)
  return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'transaction_date',
    header: 'Date',
    cell: ({ row }) => formatDateOnly(row.getValue('transaction_date'))
  },
  { accessorKey: 'description', header: 'Description' },
  {
    accessorKey: 'amount',
    header: 'Amount',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const raw = row.getValue('amount')
      if (raw == null || raw === '') return '-'
      const n = Number(raw)
      if (Number.isNaN(n)) return String(raw)
      const formatted = currencyFormatter.format(n)
      const cls = n < 0 ? 'text-error' : 'text-success'
      return h('span', { class: `font-medium ${cls}` }, formatted)
    }
  }
]

onMounted(async () => {
  try {
    const res = await fetch('/api/transactions')
    if (!res.ok) throw new Error(`Error fetching transactions: ${res.statusText}`)
    const data = await res.json()
    rows.value = data || []
  } catch (err: any) {
    error.value = err.message || 'Failed to load transactions'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <UHeader title="Transactions" />

    <UMain>
      <UContainer>
        <div class="flex justify-start pt-6 mb-4">
          <UButton to="/upload" color="neutral" variant="outline" size="xl">Back to Upload</UButton>
        </div>

        <div class="mt-6">
          <div v-if="loading">Loading transactions…</div>
          <div v-else-if="error">{{ error }}</div>
          <div v-else>
            <UTable :data="rows" :columns="columns" :loading="loading" class="w-full" />
          </div>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>
