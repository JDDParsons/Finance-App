<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
}>(), {
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rawValue = computed(() => props.modelValue ?? '')

const displayAmount = computed(() => {
  const numericValue = Number(rawValue.value)

  if (!rawValue.value || Number.isNaN(numericValue)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue)
})

function appendDigit(digit: string) {
  const current = rawValue.value
  const nextValue = current === '0' ? digit : `${current}${digit}`
  emit('update:modelValue', nextValue)
}

function appendDecimal() {
  const current = rawValue.value
  if (current.includes('.')) return
  emit('update:modelValue', current ? `${current}.` : '0.')
}

function clearValue() {
  emit('update:modelValue', '')
}

function pressKey(key: string) {
  if (key === 'clear') {
    clearValue()
    return
  }

  if (key === '.') {
    appendDecimal()
    return
  }

  const [wholePart, decimalPart = ''] = rawValue.value.split('.')
  if (rawValue.value.includes('.') && decimalPart.length >= 2) return
  if (!rawValue.value.includes('.') && wholePart === '0' && key === '0') return

  appendDigit(key)
}

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'clear']
]
</script>

<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
    <div class="mb-4 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-gray-900">
      <p class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
        Amount
      </p>
      <p class="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
        {{ displayAmount }}
      </p>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <template v-for="row in keypadRows" :key="row.join('-')">
        <button
          v-for="key in row"
          :key="key"
          type="button"
          class="flex h-14 items-center justify-center rounded-2xl border text-xl font-semibold transition-colors active:scale-[0.98] cursor-pointer"
          :class="key === 'clear'
            ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70'
            : 'border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'"
          @click="pressKey(key)"
        >
          {{ key === 'clear' ? 'Clear' : key }}
        </button>
      </template>
    </div>
  </div>
</template>
