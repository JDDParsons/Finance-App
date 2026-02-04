<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import CategoryDropdown from '~/components/CategoryDropdown.vue'

interface Category {
  id: string
  name: string | null
}

const loading = ref(true)
const rows = ref<any[]>([])
const error = ref<string | null>(null)
const categories = ref<Category[]>([])

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatAmount(val: any) {
  if (val == null || val === '') return '-'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return currencyFormatter.format(n)
}

function formatDateOnly(val: any) {
  if (!val) return '-'
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})(?:T.*Z)?$/)
    if (m && m[1]) {
      const parts = m[1].split('-').map(Number)
      const [y, mm, dd] = parts as [number, number, number]
      const local = new Date(y, mm - 1, dd)
      if (!Number.isNaN(local.getTime())) {
        const formatted = local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return formatted
      }
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
    accessorKey: 'id',
    header: 'Category',
    cell: ({ row }) => {
      const transactionId = row.getValue('id') as string
      const currentCategoryId = row.original.currentCategoryId || null
      return h(CategoryDropdown, {
        transactionId,
        currentCategoryId,
        categories: categories.value
      })
    }
  },
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
    const [transRes, catRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/categories')
    ])

    if (!transRes.ok) throw new Error(`Error fetching transactions: ${transRes.statusText}`)
    if (!catRes.ok) throw new Error(`Error fetching categories: ${catRes.statusText}`)

    const transData = await transRes.json()
    const catData = await catRes.json()

    rows.value = transData || []
    categories.value = catData || []
  } catch (err: any) {
    error.value = err.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <UHeader title="Personal Finance App">
      <template #right>
        <UColorModeSwitch />
      </template>
    </UHeader>
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
