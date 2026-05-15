<script setup lang="ts">
const MAX_DIGITS = 10 // max $99,999,999.99

const props = withDefaults(defineProps<{
  modelValue?: string
}>(), {
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Internal state: string of digit characters representing cents.
// e.g. "123" = $1.23, "" = $0.00
const digitsStr = ref('')

const flashedKey = ref<string | null>(null)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

// Sync internal state from the incoming prop, guarded to prevent emit→watch loops.
watch(() => props.modelValue, (val) => {
  const cents = Math.round(parseFloat(val || '0') * 100)
  const synced = cents > 0 ? String(cents) : ''
  if (synced !== digitsStr.value) {
    digitsStr.value = synced
  }
}, { immediate: true })

const centsValue = computed(() => parseInt(digitsStr.value || '0', 10))

const displayAmount = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(centsValue.value / 100)
})

function emitValue() {
  emit('update:modelValue', centsValue.value > 0 ? (centsValue.value / 100).toFixed(2) : '')
}

function appendDigit(digit: number) {
  if (digitsStr.value === '' && digit === 0) return
  if (digitsStr.value.length >= MAX_DIGITS) return
  digitsStr.value += String(digit)
  emitValue()
}

function backspace() {
  if (!digitsStr.value.length) return
  digitsStr.value = digitsStr.value.slice(0, -1)
  emitValue()
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

function pressKey(key: string | null) {
  if (!key) return
  flashKey(key)

  if (key === 'backspace') {
    backspace()
    return
  }

  if (/^\d$/.test(key)) {
    appendDigit(parseInt(key, 10))
  }
}

const keypadRows: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'backspace']
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
        <template v-for="key in row" :key="String(key)">
          <div v-if="key === null" class="h-18" aria-hidden="true" />
          <button
            v-else
            type="button"
            class="flex items-center justify-center border transition-colors duration-150 active:scale-[0.98] cursor-pointer"
            :class="[
              flashedKey === key
                ? 'border-green-300 bg-green-100 text-gray-900 dark:border-green-600 dark:bg-green-800/50 dark:text-white'
                : '',
              key === 'backspace'
                ? 'h-18 rounded-2xl border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:bg-gray-800'
                : 'h-18 rounded-2xl border-gray-200 bg-gray-50 text-2xl font-semibold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
            ]"
            :aria-label="key === 'backspace' ? 'Backspace' : key"
            @click="pressKey(key)"
          >
            <UIcon v-if="key === 'backspace'" name="heroicons:backspace" class="size-7" />
            <template v-else>{{ key }}</template>
          </button>
        </template>
      </template>
    </div>
  </div>
</template>
