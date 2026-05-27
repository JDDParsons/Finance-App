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
  if (draftSelectedEntity.value) return []
  const query = draftEntity.value.trim().toLowerCase()
  if (!query) return props.suggestions
  return props.suggestions.filter(s => s.toLowerCase().includes(query))
})

function applySuggestion(suggestion: string) {
  draftEntity.value = suggestion
  draftSelectedEntity.value = suggestion
}

function clearEntity() {
  draftEntity.value = ''
  draftSelectedEntity.value = null
  focusField()
}

function syncDrafts() {
  draftEntity.value = props.entity
  draftSelectedEntity.value = props.selectedEntity
}

function handleSave() {
  const normalizedEntity = draftEntity.value.trim()
  emit('save', {
    entity: normalizedEntity,
    selectedEntity: normalizedEntity || null,
  })
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

watch(() => props.open, (open) => {
  if (!open) return
  syncDrafts()
  if (!draftSelectedEntity.value) {
    focusField()
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4 pt-0">
    <div class="min-h-0">
      <div
        v-if="draftSelectedEntity"
        class="flex h-11 items-center gap-2 rounded-md border border-gray-300 px-3 dark:border-gray-700"
      >
        <span class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {{ draftSelectedEntity }}
        </span>
        <button type="button" class="ml-auto cursor-pointer" @click="clearEntity">
          <UIcon name="heroicons:x-circle" class="size-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
        </button>
      </div>

      <div v-else ref="fieldRef">
        <UInput
          v-model="draftEntity"
          variant="soft"
          color="neutral"
          :placeholder="isIncome ? 'Enter a payer...' : 'Enter a payee...'"
          type="text"
          size="xl"
          class="w-full"
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
      <UButton color="primary" @click="handleSave">
        Save
      </UButton>
    </div>
  </div>
</template>
