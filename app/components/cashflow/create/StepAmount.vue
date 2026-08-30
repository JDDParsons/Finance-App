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
      <div class="flex min-h-0 flex-1 flex-col justify-end">
        <div class="px-4 py-24 text-center">
        <div class="absolute top-4 left-4 flex w-[calc(100%_-_2rem)] items-start gap-2 overflow-hidden">
            <button
              v-if="entityLabel"
              type="button"
              class="inline-flex min-w-0 max-w-[45%] shrink cursor-pointer items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 transition-colors hover:border-green-300 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50"
              :aria-label="isIncome ? 'Edit payer' : 'Edit payee'"
              @click="openEntityModal"
            >
              <span class="truncate">{{ entityLabel }}</span>
            </button>
            <UButton
              v-else
              color="neutral"
              variant="soft"
              size="sm"
              icon="heroicons:user"
              class="shrink-0 rounded-full"
              :aria-label="entityButtonLabel"
              @click="openEntityModal"
            >
              {{ entityButtonLabel }}
            </UButton>

            <button
              v-if="notesPreview"
              type="button"
              class="inline-flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-left text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:border-gray-600"
              :aria-label="notesButtonLabel"
              @click="openNotesModal"
            >
              <UIcon name="heroicons:document-text" class="size-4 shrink-0 text-gray-400 dark:text-gray-500" />
              <span class="truncate">{{ notesPreview }}</span>
            </button>
            <UButton
              v-else
              color="neutral"
              variant="soft"
              size="sm"
              icon="heroicons:document-text"
              class="shrink-0 rounded-full"
              :aria-label="notesButtonLabel"
              @click="openNotesModal"
            >
              {{ notesButtonLabel }}
            </UButton>
          </div>

          <p class="text-7xl font-light tracking-tight text-gray-900 dark:text-white sm:text-8xl">
            {{ displayAmount }}
          </p>
        </div>

        <div class="px-4 pb-4">
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              :aria-label="typePillAriaLabel"
              @click="emit('changeBudget')"
            >
              <div
                v-if="isIncome"
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30"
              >
                <UIcon name="heroicons:banknotes-solid" class="size-4 text-green-500" />
              </div>
              <div
                v-else-if="expensePillBudget"
                class="flex size-7 shrink-0 items-center justify-center rounded-full"
                :style="expensePillBudget.color ? { backgroundColor: `${expensePillBudget.color}33`, borderColor: expensePillBudget.color, border: '1.5px solid' } : {}"
                :class="!expensePillBudget.color ? 'border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800' : ''"
              >
                <UIcon
                  :name="expensePillBudget.icon ?? budgetIcon(expensePillBudget.name)"
                  class="size-4"
                  :style="expensePillBudget.color ? { color: expensePillBudget.color } : {}"
                  :class="!expensePillBudget.color ? 'text-gray-500 dark:text-gray-400' : ''"
                />
              </div>
              <div
                v-else
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
              >
                <UIcon name="heroicons:x-mark" class="size-4 text-gray-400" />
              </div>
              <span class="max-w-32 truncate">{{ typePillLabel }}</span>
            </button>

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
        <UCard>
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
