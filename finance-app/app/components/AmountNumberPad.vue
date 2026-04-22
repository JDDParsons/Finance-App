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
const flashedKey = ref<string | null>(null)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

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

function flashKey(key: string) {
  flashedKey.value = key

  if (flashTimeout) {
    clearTimeout(flashTimeout)
  }

  flashTimeout = setTimeout(() => {
    flashedKey.value = null
  }, 140)
}

function pressKey(key: string) {
  flashKey(key)

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

onBeforeUnmount(() => {
  if (flashTimeout) {
    clearTimeout(flashTimeout)
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-1 min-h-0 flex-col justify-end">
      <div class="px-4 py-24 text-center">
        <p class="text-7xl font-light tracking-tight text-gray-900 dark:text-white sm:text-8xl">
          {{ displayAmount }}
        </p>
      </div>

      <div class="px-4 pb-4">
        <slot name="controls" />
      </div>

      <div v-if="$slots.actions" class="px-1 pb-1">
        <slot name="actions" />
      </div>
    </div>

    <div class="mt-auto grid grid-cols-3 gap-1 border-t border-gray-200 px-3 pt-1 pb-1 dark:border-gray-800">
      <template v-for="row in keypadRows" :key="row.join('-')">
        <button
          v-for="key in row"
          :key="key"
          type="button"
          class="flex items-center justify-center border transition-colors duration-150 active:scale-[0.98] cursor-pointer"
          :class="[
            flashedKey === key
              ? 'border-green-300 bg-green-100 text-gray-900 dark:border-green-600 dark:bg-green-800/50 dark:text-white'
              : '',
            key === 'clear'
              ? 'h-18 rounded-2xl border-red-200 bg-red-50 text-2xl font-semibold text-red-500 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70'
              : 'h-18 rounded-2xl border-gray-200 bg-gray-50 text-2xl font-semibold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
          ]"
          @click="pressKey(key)"
        >
          {{ key === 'clear' ? 'Clear' : key }}
        </button>
      </template>
    </div>
  </div>
</template>
