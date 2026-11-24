<script setup lang="ts">
const props = defineProps<{
  open: boolean
  isIncome: boolean
  entity: string
  selectedEntity: string | null
  suggestions: string[]
}>()

const emit = defineEmits<{
  save: [payload: { entity: string; selectedEntity: string | null }]
  cancel: []
}>()
const fieldRef = ref<HTMLElement | null>(null)
const draftEntity = ref('')
const draftSelectedEntity = ref<string | null>(null)

const filteredSuggestions = computed((): string[] => {
  const query = draftEntity.value.trim().toLowerCase()
  if (!query) return props.suggestions
  return props.suggestions.filter(s => s.toLowerCase().includes(query))
})

// Tapping an existing entity is the choice: it is saved and the picker closes.
function applySuggestion(suggestion: string) {
  draftEntity.value = suggestion
  draftSelectedEntity.value = suggestion
  emit('save', { entity: suggestion, selectedEntity: suggestion })
}

// Removes the entity from the record and closes the picker.
function handleClear() {
  emit('save', { entity: '', selectedEntity: null })
}

function clearEntity() {
  draftEntity.value = ''
  draftSelectedEntity.value = null
  focusField()
}

// Opening again to change a chosen entity starts with an empty search and the full
// list, so no chip has to be cleared first. A typed name is still shown for editing.
function syncDrafts() {
  draftEntity.value = props.selectedEntity ? '' : props.entity
  draftSelectedEntity.value = null
}

// Enter saves a typed name; an empty search changes nothing.
function handleSave() {
  const normalizedEntity = draftEntity.value.trim()
  if (!normalizedEntity) return
  emit('save', {
    entity: normalizedEntity,
    selectedEntity: draftSelectedEntity.value ? normalizedEntity : null,
  })
}

function focusField() {
  if (!import.meta.client) return

  nextTick(() => {
    requestAnimationFrame(() => {
      const input = fieldRef.value?.querySelector('input')
      if (!(input instanceof HTMLInputElement)) return
      input.focus({ preventScroll: true })
    })
  })
}

watch(() => props.open, (open) => {
  if (!open) return
  syncDrafts()
  focusField()
}, { immediate: true })
</script>

<template>
  <div class="p-4 pt-0">
    <div class="min-h-0">
      <div ref="fieldRef">
        <UInput
          v-model="draftEntity"
          variant="soft"
          color="neutral"
          :placeholder="isIncome ? 'Enter a payer...' : 'Enter a payee...'"
          type="text"
          size="xl"
          class="w-full"
          @keydown.enter.prevent="handleSave"
        >
          <template v-if="draftEntity" #trailing>
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

    <div class="mt-6 flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" @click="emit('cancel')">
        Cancel
      </UButton>
      <UButton color="neutral" variant="soft" @click="handleClear">
        Clear
      </UButton>
    </div>
  </div>
</template>
