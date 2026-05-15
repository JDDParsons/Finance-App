<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
}>(), {
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const todayValue = new Date().toLocaleDateString('en-CA')

const displayLabel = computed(() => {
  if (!props.modelValue) return 'Select date'
  if (props.modelValue === todayValue) return 'Today'

  const [year, month, day] = props.modelValue.split('-').map(Number)
  if (!year || !month || !day) return props.modelValue

  const parsed = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed)
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:modelValue', target?.value ?? '')
}

function openPicker() {
  const input = inputRef.value
  if (!input) return
  if (typeof input.showPicker === 'function') input.showPicker()
}
</script>

<template>
  <label
    class="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
    aria-label="Choose date"
    @click="openPicker"
  >
      <UIcon name="heroicons-solid:calendar-days" class="size-6 text-gray-400" />
      <span class="whitespace-nowrap">{{ displayLabel }}</span>

    <input
      ref="inputRef"
      :value="props.modelValue"
      type="date"
      class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      aria-label="Choose date"
      @input="handleInput"
      @change="handleInput"
    />
  </label>
</template>
