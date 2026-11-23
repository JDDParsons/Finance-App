<script setup lang="ts">
// A payee or payer field that opens the same entity picker used when creating an
// expense or income (CashflowCreateStepEntity), so existing entities can be chosen.
const props = defineProps<{
  isIncome: boolean
  /** Existing entities to suggest, as in the create flow. */
  suggestions: string[]
}>()

const entity = defineModel<string>({ default: '' })

const isOpen = ref(false)

const label = computed(() => props.isIncome ? 'Payer' : 'Payee')
const placeholder = computed(() => props.isIncome ? 'Add a payer' : 'Add a payee')

// The picker shows a chosen chip when the value is one of the suggestions.
const selectedEntity = computed(() => {
  const current = entity.value.trim().toLowerCase()
  if (!current) return null
  return props.suggestions.find(suggestion => suggestion.toLowerCase() === current) ?? null
})

function close() {
  isOpen.value = false
}

function handleSave(payload: { entity: string; selectedEntity: string | null }) {
  entity.value = payload.entity
  isOpen.value = false
}
</script>

<template>
  <UFormField :label="label">
    <button
      type="button"
      class="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-left transition-colors hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
      :aria-label="entity ? `Change ${label.toLowerCase()}, currently ${entity}` : placeholder"
      @click="isOpen = true"
    >
      <span v-if="entity" class="truncate text-gray-900 dark:text-white">{{ entity }}</span>
      <span v-else class="text-gray-400">{{ placeholder }}</span>
      <UIcon name="heroicons:pencil-square" class="size-4 shrink-0 text-gray-400" />
    </button>
  </UFormField>

  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ isIncome ? 'Choose a Payer' : 'Choose a Payee' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ isIncome ? 'Who paid you?' : 'Who did you pay?' }}
              </p>
            </div>
            <UButton
              icon="heroicons:x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="`Close ${label.toLowerCase()} picker`"
              @click="close"
            />
          </div>
        </template>

        <CashflowCreateStepEntity
          :open="isOpen"
          :is-income="isIncome"
          :entity="entity"
          :selected-entity="selectedEntity"
          :suggestions="suggestions"
          @save="handleSave"
          @cancel="close"
        />
      </UCard>
    </template>
  </UModal>
</template>
