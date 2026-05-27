<script setup lang="ts">
const MAX_CENTS = 9_999_999 // max $99,999.99

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

  const nextDigits = `${digitsStr.value}${digit}`
  const nextCents = parseInt(nextDigits, 10)
  if (nextCents > MAX_CENTS) return

  digitsStr.value = nextDigits
  emitValue()
}

function backspace() {
  if (!digitsStr.value.length) return
  digitsStr.value = digitsStr.value.slice(0, -1)
  emitValue()
}

function clearAmount() {
  if (!digitsStr.value.length) return
  digitsStr.value = ''
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

  if (key === 'clear') {
    clearAmount()
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
  ['clear', '0', 'backspace']
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

    </div>

    <div class="mt-auto grid grid-cols-3 gap-1 border-gray-200 px-3 pt-2 pb-2 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/10 border-t-blue-200 dark:border-t-blue-900 border-t-4">
      <template v-for="row in keypadRows" :key="row.join('-')">
        <template v-for="key in row" :key="String(key)">
          <button
            type="button"
            class="flex h-18 items-center justify-center shadow-md border-2 transition-colors duration-150 active:scale-[0.98] cursor-pointer rounded-2xl border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            :class="[
              flashedKey === key
                ? 'border-green-300 bg-green-100 text-gray-900 dark:border-green-600 dark:bg-green-800/50 dark:text-white'
                : '',
              key === 'backspace'
                ? 'text-gray-400 dark:text-gray-500'
                : key === 'clear'
                  ? 'text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
                  : 'text-2xl font-semibold text-gray-900 dark:text-white'
            ]"
            :aria-label="key === 'backspace' ? 'Backspace' : key === 'clear' ? 'Clear amount' : (key ?? '')"
            @click="pressKey(key)"
          >
            <UIcon v-if="key === 'backspace'" name="heroicons:backspace" class="size-7" />
            <template v-else-if="key === 'clear'">Clear</template>
            <template v-else>{{ key }}</template>
          </button>
        </template>
      </template>
    </div>

    <div v-if="$slots.actions" class="shrink-0 border-t border-gray-100 dark:border-gray-800">
      <slot name="actions" />
    </div>
  </div>
</template>
