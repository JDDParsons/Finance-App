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
    // The year only shows when it is not this year, so the label fits the pill.
    ...(year === new Date().getFullYear() ? {} : { year: 'numeric' }),
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
  <TagPill
    as="label"
    icon="heroicons-solid:calendar-days"
    :label="displayLabel"
    :filled="!!props.modelValue"
    aria-label="Choose date"
    @click="openPicker"
  >
    <input
      ref="inputRef"
      :value="props.modelValue"
      type="date"
      class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      aria-label="Choose date"
      @input="handleInput"
      @change="handleInput"
    />
  </TagPill>
</template>
