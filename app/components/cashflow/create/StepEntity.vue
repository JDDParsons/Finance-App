<script setup lang="ts">
const props = defineProps<{
  isIncome: boolean
  suggestions: string[]
  shouldAutofocus?: boolean
}>()

const entity = defineModel<string>('entity', { default: '' })
const selectedEntity = defineModel<string | null>('selectedEntity', { default: null })

const emit = defineEmits<{ continue: [] }>()
const fieldRef = ref<HTMLElement | null>(null)

const filteredSuggestions = computed((): string[] => {
  if (selectedEntity.value) return []
  const query = entity.value.trim().toLowerCase()
  if (!query) return props.suggestions
  return props.suggestions.filter(s => s.toLowerCase().includes(query))
})

function applySuggestion(suggestion: string) {
  entity.value = suggestion
  selectedEntity.value = suggestion
}

function clearEntity() {
  entity.value = ''
  selectedEntity.value = null
}

function focusField() {
  if (!import.meta.client) return

  nextTick(() => {
    requestAnimationFrame(() => {
      const input = fieldRef.value?.querySelector('input')
      if (!(input instanceof HTMLInputElement)) return
      input.focus()
    })
  })
}

watch(() => props.shouldAutofocus, (shouldAutofocus) => {
  if (!shouldAutofocus || selectedEntity.value) return
  focusField()
}, { immediate: true })
</script>

<template>
  <div class="absolute inset-0 flex flex-col">
    <div class="shrink-0 px-4 pt-4 pb-0">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ isIncome ? 'Add a Payer' : 'Add a Payee' }}
        <span class="text-base font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
      </h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ isIncome ? 'Who paid you?' : 'Who did you pay?' }}
      </p>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <!-- Pill display when entity is selected -->
      <div
        v-if="selectedEntity"
        class="flex h-11 items-center gap-2 rounded-md border border-gray-300 px-3 dark:border-gray-700"
      >
        <span class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {{ selectedEntity }}
        </span>
        <button type="button" class="ml-auto cursor-pointer" @click="clearEntity">
          <UIcon name="heroicons:x-circle" class="size-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
        </button>
      </div>

      <!-- Text input when no entity is selected -->
      <div v-else ref="fieldRef">
        <UInput
          v-model="entity"
          variant="soft"
          color="neutral"
          :placeholder="isIncome ? 'Enter a payer...' : 'Enter a payee...'"
          type="text"
          size="xl"
          class="w-full"
        >
          <template v-if="entity" #trailing>
            <button type="button" class="cursor-pointer" @click="clearEntity">
              <UIcon name="heroicons:x-circle" class="size-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
            </button>
          </template>
        </UInput>
      </div>

      <div v-if="filteredSuggestions.length" class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="suggestion in filteredSuggestions"
          :key="suggestion"
          type="button"
          class="cursor-pointer rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 transition-colors hover:border-green-300 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50"
          @click="applySuggestion(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <div class="shrink-0 border-t border-gray-100 dark:border-gray-800">
      <UButton
        color="primary"
        variant="solid"
        class="h-14 w-full justify-center rounded-none text-center text-base font-semibold"
        @click="emit('continue')"
      >
        Continue
      </UButton>
    </div>
  </div>
</template>
