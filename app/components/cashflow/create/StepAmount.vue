<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

const props = defineProps<{
  transactionType: 'expense' | 'income'
  selectedBudgetId: string
  noBudget: boolean
  suggestions: string[]
  loading: boolean
  error: string | null
}>()

const amount = defineModel<string>('amount', { default: '' })
const date = defineModel<string>('date', { default: '' })
const accountId = defineModel<string | null>('accountId', { default: null })
const entity = defineModel<string>('entity', { default: '' })
const selectedEntity = defineModel<string | null>('selectedEntity', { default: null })
const notes = defineModel<string>('notes', { default: '' })
const tags = defineModel<string[]>('tags', { default: () => [] })

const emit = defineEmits<{
  changeBudget: []
  submit: []
}>()

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const isIncome = computed(() => props.transactionType === 'income')

const activeBudgetId = computed(() => {
  if (props.noBudget) return null
  return props.selectedBudgetId || null
})

const expensePillBudget = computed(() =>
  [...store.budgets, ...store.incomeBudgets].find((b: any) => b.id === activeBudgetId.value) ?? null
)

const typePillLabel = computed(() =>
  expensePillBudget.value?.name ?? (isIncome.value ? 'Unassigned income' : 'No budget')
)

const typePillAriaLabel = computed(() =>
  isIncome.value
    ? 'Change type'
    : (expensePillBudget.value ? `Change budget from ${expensePillBudget.value.name}` : 'Choose budget')
)

const notesPreview = computed(() => notes.value.trim())
const displayAmount = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount.value || '0'))
})

const entityLabel = computed(() => selectedEntity.value || entity.value.trim())
const entityButtonLabel = computed(() => isIncome.value ? 'Add payer' : 'Add payee')
const notesButtonLabel = computed(() => notesPreview.value ? 'Edit note' : 'Add note')
const submitLabel = computed(() => isIncome.value ? 'Submit income' : 'Submit expense')

// Tags are for expenses only. The pill shows the first tag and how many more there are.
const tagsLabel = computed(() => {
  if (!tags.value.length) return 'Add tags'
  const [first] = tags.value
  return tags.value.length > 1 ? `${first} +${tags.value.length - 1}` : first!
})
const tagField = ref<{ open: () => void } | null>(null)

const isEntityModalOpen = ref(false)
const isNotesModalOpen = ref(false)

function openEntityModal() {
  isEntityModalOpen.value = true
}

function openNotesModal() {
  isNotesModalOpen.value = true
}

function handleEntitySave(payload: { entity: string; selectedEntity: string | null }) {
  entity.value = payload.entity
  selectedEntity.value = payload.selectedEntity
  isEntityModalOpen.value = false
}

function handleNotesSave(nextNotes: string) {
  notes.value = nextNotes
  isNotesModalOpen.value = false
}
</script>

<template>
  <div class="absolute inset-0 flex flex-col overflow-hidden">
    <div v-if="error" class="p-4 pb-0">
      <UAlert title="Error" :description="error" color="error" variant="soft" />
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="shrink-0 px-4 pt-4">
          <div class="flex flex-wrap items-start justify-center gap-2">
            <TagPill
              icon="heroicons:user"
              :label="entityLabel || entityButtonLabel"
              :filled="!!entityLabel"
              :aria-label="entityLabel ? (isIncome ? 'Edit payer' : 'Edit payee') : entityButtonLabel"
              @click="openEntityModal"
            />
            <TagPill
              icon="heroicons:document-text"
              :label="notesPreview || notesButtonLabel"
              :filled="!!notesPreview"
              :aria-label="notesButtonLabel"
              @click="openNotesModal"
            />
            <TagPill
              v-if="!isIncome"
              icon="fa7-solid:tag"
              :label="tagsLabel"
              :filled="tags.length > 0"
              :aria-label="tags.length ? `Edit tags, currently ${tags.join(', ')}` : 'Add tags'"
              @click="tagField?.open()"
            />
            <TagField v-if="!isIncome" ref="tagField" v-model="tags" />
          </div>
        </div>

        <!-- The amount takes the space between the two rows, so it stays centred when the screen is short. -->
        <div class="flex min-h-0 flex-1 items-center justify-center px-4 text-center">
          <p class="text-7xl font-light tracking-tight text-gray-900 dark:text-white sm:text-8xl">
            {{ displayAmount }}
          </p>
        </div>

        <div class="shrink-0 px-4 pb-4">
          <div class="flex flex-wrap items-center justify-center gap-2">
            <TagPill
              :icon="isIncome && !expensePillBudget ? 'heroicons:banknotes' : (expensePillBudget ? (expensePillBudget.icon ?? budgetIcon(expensePillBudget.name)) : 'heroicons:x-mark')"
              :label="typePillLabel"
              :tint="expensePillBudget?.color ?? null"
              :aria-label="typePillAriaLabel"
              @click="emit('changeBudget')"
            />

            <DateTagPicker v-model="date" />
            <AccountTagPicker v-model="accountId" :accounts="store.accounts" />
          </div>
        </div>
      </div>

      <AmountNumberPad v-model="amount" />

      <div class="shrink-0 bg-green-50 px-4 pb-4 dark:bg-green-900/40">
        <UButton
          color="primary"
          variant="ghost"
          class="mx-auto flex h-[3.75rem] w-[22.5rem] justify-center rounded-full 
          border-2 border-green-500 bg-linear-to-r from-green-400 to-emerald-500 
          dark:border-emerald-500/50 dark:from-green-500/80 dark:to-emerald-400/30
          text-center text-base font-semibold text-white 
          shadow-lg shadow-green-500/30 
          transition-all duration-200 
          hover:from-green-500 hover:to-emerald-600 hover:shadow-green-500/50 
          active:scale-[0.95] active:brightness-110"
          :disabled="loading"
          :loading="loading"
          @click="emit('submit')"
        >
          {{ submitLabel }}
        </UButton>
      </div>
    </div>

    <UModal v-model:open="isEntityModalOpen">
      <template #content>
        <UCard class="flex max-h-[min(36rem,70dvh)] flex-col" :ui="{ header: 'shrink-0', body: 'flex min-h-0 flex-col' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ isIncome ? 'Add a Payer' : 'Add a Payee' }}
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
                aria-label="Close entity editor"
                @click="isEntityModalOpen = false"
              />
            </div>
          </template>

          <CashflowCreateStepEntity
            :open="isEntityModalOpen"
            :is-income="isIncome"
            :entity="entity"
            :selected-entity="selectedEntity"
            :suggestions="props.suggestions"
            @save="handleEntitySave"
            @cancel="isEntityModalOpen = false"
          />
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="isNotesModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a note</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Any additional details?</p>
              </div>
              <UButton
                icon="heroicons:x-mark"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Close notes editor"
                @click="isNotesModalOpen = false"
              />
            </div>
          </template>

          <CashflowCreateStepNotes
            :open="isNotesModalOpen"
            :notes="notes"
            @save="handleNotesSave"
            @cancel="isNotesModalOpen = false"
          />
        </UCard>
      </template>
    </UModal>
  </div>
</template>
