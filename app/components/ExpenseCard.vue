<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { getMissingBudgetPeriodMessage } from '~/utils/budgetErrors'
import { accountDisplayName } from '../../utils/accountAppearance'

// An expense as a card. Tapping it (or its edit icon) expands it in place: the spacing
// grows, hidden fields fade in and empty fields show as "Add ..." prompts. Every field
// can then be changed, and the green check in the bottom right corner saves all the
// changes at once. Changes are kept in a draft until then. Dragging the card left reveals
// Delete. With `modal` the card is always expanded (used inside a modal).
const props = defineProps<{
    expenseId: string
    modal?: boolean
}>()

const expanded = defineModel<boolean>('expanded', { default: false })

const emit = defineEmits<{
    delete: []
}>()

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

// What is saved comes from the expense in the store, so the card follows refreshes,
// queued changes and edits made elsewhere.
const hit = computed(() => store.budgetHits.find((h: any) => h.id === props.expenseId) ?? null)
const isOpen = computed(() => !!props.modal || expanded.value)

interface ExpenseValues {
    amount: string
    date: string
    entity: string
    notes: string
    budgetId: string | null
    accountId: string | null
    tags: string[]
}

function savedValues(): ExpenseValues {
    const row = hit.value
    return {
        amount: String(row?.amount ?? ''),
        date: (row?.date ?? '').slice(0, 10),
        entity: row?.entity ?? '',
        notes: row?.notes ?? '',
        budgetId: row?.budget_id ?? null,
        accountId: row?.account_id ?? null,
        tags: [...(row?.tags ?? [])],
    }
}

function valuesKey(values: ExpenseValues) {
    return JSON.stringify([
        Number(values.amount), values.date, values.entity, values.notes,
        values.budgetId, values.accountId, [...values.tags].sort(),
    ])
}

// The draft is what the fields show and edit. It matches the saved expense until the
// user changes something, and follows the saved expense while nothing has been changed.
const draft = reactive<ExpenseValues>(savedValues())
const baselineKey = ref(valuesKey(draft))
const dirty = computed(() => valuesKey(draft) !== baselineKey.value)

function resetDraft() {
    Object.assign(draft, savedValues())
    baselineKey.value = valuesKey(draft)
}

watch(() => valuesKey(savedValues()), () => {
    if (!dirty.value) resetDraft()
})

const amountNumber = computed(() => draft.amount.trim() === '' ? null : Number(draft.amount))

const deleting = ref(false)
const error = ref<string | null>(null)
const saving = ref(false)

// Fields with an inline editor. Tapping a field opens its editor, and several can be
// open at once. They all close when the card collapses.
type EditableField = 'amount' | 'notes' | 'account'
const editing = reactive<Record<EditableField, boolean>>({ amount: false, notes: false, account: false })
const anyEditing = computed(() => editing.amount || editing.notes || editing.account)

function closeEditors() {
    editing.amount = false
    editing.notes = false
    editing.account = false
}

const choosingBudget = ref(false)
const entityPicker = ref<{ open: () => void } | null>(null)
const tagPicker = ref<{ open: () => void } | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

const chosenBudget = computed(() => draft.budgetId ? store.budgets.find((b: any) => b.id === draft.budgetId) ?? null : null)
const budgetColor = computed<string | null>(() => chosenBudget.value?.color ?? null)
const borderColor = computed(() => budgetColor.value || '#E5E7EB')

const chosenAccount = computed(() => draft.accountId ? store.accounts.find((a: any) => a.id === draft.accountId) ?? null : null)
const accountName = computed(() => chosenAccount.value ? accountDisplayName(chosenAccount.value) : null)

const accountOptions = computed(() => [
    { label: 'No account', value: '__none__' },
    ...store.accounts.map((a: any) => ({
        label: accountDisplayName(a),
        value: a.id,
    }))
])

const accountChoice = computed({
    get: () => draft.accountId ?? '__none__',
    set: (value: string) => { draft.accountId = value === '__none__' ? null : value },
})

const creator = computed(() => {
    const userId = hit.value?.user_id
    return userId ? store.userProfiles.get(userId) ?? null : null
})

// Existing payees for the chosen budget, the same suggestions the create flow shows.
const entitySuggestions = computed((): string[] => {
    if (!draft.budgetId) return []
    return store.budgetAllEntities.get(draft.budgetId) ?? []
})

function formatCurrency(value: number | string | null) {
    if (value == null || value === '') return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
}

function formatDate(value: string) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

function startField(field: EditableField) {
    if (!isOpen.value || saving.value) return
    error.value = null
    // One editor at a time. What was typed in the one being closed stays in the draft.
    closeEditors()
    editing[field] = true
    if (field === 'amount') nextTick(() => amountInput.value?.focus())
}

// The date is a native date input laid over the date text, so one tap opens the picker.
function onDateClick(event: MouseEvent) {
    try { (event.target as HTMLInputElement).showPicker?.() } catch { /* the browser decides */ }
}

function onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value
    if (value) draft.date = value
}

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
    choosingBudget.value = false
    draft.budgetId = selection.noBudget ? null : selection.budgetId
}

function closeBudgetPicker() {
    choosingBudget.value = false
}

function startBudgetChange() {
    if (!isOpen.value || saving.value) return
    error.value = null
    choosingBudget.value = true
}

function openEntityPicker() {
    if (!isOpen.value || saving.value) return
    const id = draft.budgetId
    if (id && !store.budgetAllEntities.has(id)) {
        // Offline or failed: the picker still works with typed names.
        store.fetchBudgetEntities(id).catch(() => {})
    }
    entityPicker.value?.open()
}

function openTagPicker() {
    if (!isOpen.value || saving.value) return
    error.value = null
    tagPicker.value?.open()
}

function handleTagsSelect(names: string[]) {
    draft.tags = [...names]
}

function handleEntitySelect(value: string) {
    draft.entity = value
}

// The cancel icon: drops the changes and collapses the card (a card in a modal stays open).
function cancel() {
    if (saving.value) return
    resetDraft()
    finish()
}

// Closes the editors and collapses the card (a card in a modal stays open).
function finish() {
    closeEditors()
    error.value = null
    if (!props.modal) expanded.value = false
}

// The green check: saves every changed field in one update, or just closes the card
// when nothing changed.
async function saveAll() {
    if (saving.value) return
    if (!dirty.value) { finish(); return }

    const value = amountNumber.value
    if (value === null || !Number.isFinite(value) || value === 0) {
        error.value = 'Please enter an amount'
        closeEditors()
        editing.amount = true
        return
    }

    const saved = savedValues()
    const next = { ...draft }
    saving.value = true
    error.value = null
    try {
        await store.updateExpense(
            props.expenseId,
            next.budgetId,
            next.date,
            String(value),
            next.entity,
            next.accountId,
            next.notes,
            // The tags are only sent when this edit changes them.
            [...next.tags].sort().join('\n') !== [...saved.tags].sort().join('\n') ? next.tags : undefined
        )
        resetDraft()
        finish()
    } catch (err: any) {
        const budgetName = store.budgets.find((b: any) => b.id === next.budgetId)?.name ?? chosenBudget.value?.name ?? 'This budget'
        error.value = getMissingBudgetPeriodMessage(err, budgetName, next.date)
            || err?.message
            || 'Error updating expense'
        console.error('Error updating expense:', err)
    } finally {
        saving.value = false
    }
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
        swipeOffset.value = 0
        return
    }
    try {
        deleting.value = true
        error.value = null
        await store.removeExpense(props.expenseId)
        emit('delete')
    } catch (err: any) {
        error.value = err?.message || 'Error deleting expense'
        console.error('Error deleting expense:', err)
        deleting.value = false
        swipeOffset.value = 0
    }
}

// --- Bounce when the card expands or collapses ---
const bounceTarget = ref<HTMLElement | null>(null)

watch(expanded, () => {
    if (props.modal || !import.meta.client) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    bounceTarget.value?.animate(
        [
            { transform: 'scale(1)' },
            { transform: 'scale(1.02)', offset: 0.4 },
            { transform: 'scale(0.995)', offset: 0.75 },
            { transform: 'scale(1)' },
        ],
        { duration: 320, easing: 'ease-out' }
    )
})

// Opening starts from what is saved. Collapsing (for instance because another card was
// opened) drops any changes that were not saved.
watch(expanded, () => {
    resetDraft()
    closeEditors()
    error.value = null
})

// --- Swipe left to delete ---
// Dragging the card left (finger or mouse) slides it over a red Delete action. A
// drag that is mostly vertical is left alone so the page can still scroll.
const SWIPE_OPEN = 96
const swipeOffset = ref(0)
const swiping = ref(false)
let swipeStart: { x: number; y: number; base: number; id: number } | null = null
let swipeMoved = false

function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (anyEditing.value || saving.value) return
    if ((event.target as HTMLElement).closest('input, textarea, select')) return
    swipeStart = { x: event.clientX, y: event.clientY, base: swipeOffset.value, id: event.pointerId }
    swipeMoved = false
}

function onPointerMove(event: PointerEvent) {
    if (!swipeStart || event.pointerId !== swipeStart.id) return
    const dx = event.clientX - swipeStart.x
    const dy = event.clientY - swipeStart.y
    if (!swiping.value) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        swiping.value = true
        swipeMoved = true
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }
    swipeOffset.value = Math.min(0, Math.max(-SWIPE_OPEN, swipeStart.base + dx))
}

function onPointerEnd(event: PointerEvent) {
    if (!swipeStart || event.pointerId !== swipeStart.id) return
    swipeStart = null
    if (!swiping.value) return
    swiping.value = false
    swipeOffset.value = swipeOffset.value < -SWIPE_OPEN / 2 ? -SWIPE_OPEN : 0
}

// Runs before the fields see a tap:
// - the click that ends a drag is ignored, and a tap on a swiped-open card closes it
// - a tap on a collapsed card only expands it (the edit icon does the same)
// - a tap on an expanded card away from any field collapses it, unless a field is being
//   edited or there are unsaved changes (the check saves them)
function onClickCapture(event: MouseEvent) {
    if (swipeMoved) {
        swipeMoved = false
        event.stopPropagation()
        event.preventDefault()
        return
    }
    if (swipeOffset.value !== 0) {
        swipeOffset.value = 0
        event.stopPropagation()
        event.preventDefault()
        return
    }
    if (props.modal) return
    if (!expanded.value) {
        expanded.value = true
        event.stopPropagation()
        event.preventDefault()
        return
    }
    if (anyEditing.value || dirty.value) return
    if (!(event.target as HTMLElement).closest('button, input, textarea, select, a')) {
        expanded.value = false
    }
}
</script>

<template>
    <div v-if="hit" ref="bounceTarget" class="relative rounded-lg" :class="{ 'overflow-hidden': swipeOffset < 0 || swiping }">
        <!-- Choose budget -->
        <UModal v-model:open="choosingBudget">
            <template #content>
                <UCard>
                    <BudgetsChooseBudget
                        :budgets="store.budgets"
                        :expenses-only="true"
                        @select="handleBudgetSelect"
                    />
                    <div class="mt-4">
                        <UButton color="neutral" variant="ghost" @click="closeBudgetPicker">Cancel</UButton>
                    </div>
                </UCard>
            </template>
        </UModal>

        <!-- Revealed by swiping the card left -->
        <div v-show="swipeOffset < 0" class="absolute inset-y-0 right-0 flex bg-red-600" :style="{ width: `${SWIPE_OPEN}px` }">
            <button
                type="button"
                class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-white"
                aria-label="Delete expense"
                :disabled="saving || deleting"
                @click="handleDelete"
            >
                <UIcon name="heroicons-solid:trash" class="size-5" />
                <span class="text-xs font-medium">Delete</span>
            </button>
        </div>

        <UCard
            class="shadow"
            :class="isOpen ? '' : 'cursor-pointer'"
            :style="{
                borderLeft: `4px solid ${borderColor}`,
                transform: `translateX(${swipeOffset}px)`,
                transition: swiping ? 'none' : 'transform 150ms ease',
                touchAction: 'pan-y',
            }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
            @click.capture="onClickCapture"
        >
            <div v-if="error" class="pb-2" role="alert">
                <UAlert title="Error" :description="error" color="error" variant="soft" />
            </div>

            <!-- Amount, with the budget icon at the right -->
            <ExpandRow :expanded="isOpen" collapsed-pad="pt-0" expanded-pad="pt-0">
                <div class="flex items-center gap-2">
                    <input
                        v-if="editing.amount"
                        ref="amountInput"
                        v-model="draft.amount"
                        type="number"
                        step="0.01"
                        inputmode="decimal"
                        placeholder="0.00"
                        aria-label="Amount"
                        class="w-[calc(40%-1.5rem)] min-w-0 flex-none border-b border-info/50 bg-transparent text-xl font-semibold text-info outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        @keydown.enter.prevent="saveAll"
                    />
                    <button
                        v-else
                        type="button"
                        class="flex-1 text-left text-xl font-semibold text-info disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        aria-label="Edit amount"
                        @click="startField('amount')"
                    >{{ formatCurrency(amountNumber) }}</button>

                    <!-- Budget icon: colored circle or grey X pattern for uncategorized -->
                    <button
                        type="button"
                        class="ml-auto shrink-0 rounded-full disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        :aria-label="`Change budget, currently ${chosenBudget?.name ?? 'No budget'}`"
                        :title="chosenBudget?.name ?? 'No budget'"
                        @click="startBudgetChange"
                    >
                        <div
                            v-if="chosenBudget && budgetColor"
                            class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            :style="{ backgroundColor: budgetColor + '33' }"
                        >
                            <UIcon :name="chosenBudget.icon ?? budgetIcon(chosenBudget.name)" class="w-4 h-4" :style="{ color: budgetColor }" />
                        </div>
                        <div
                            v-else
                            class="w-7 h-7 rounded-full shrink-0"
                            style="background-color: #F3F4F6; background-image: repeating-linear-gradient(45deg, #D1D5DB 0, #D1D5DB 0.6px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #D1D5DB 0, #D1D5DB 0.6px, transparent 0, transparent 50%); background-size: 8px 8px;"
                        />
                    </button>
                </div>
            </ExpandRow>

            <!-- Payee (not indented) -->
            <ExpandRow :open="isOpen || !!draft.entity" :expanded="isOpen">
                <button
                    type="button"
                    class="flex items-center gap-1.5 text-left text-sm disabled:cursor-default"
                    :class="[draft.entity ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600', isOpen ? 'cursor-pointer' : 'pointer-events-none']"
                    aria-label="Edit payee"
                    @click="openEntityPicker"
                >
                    <UIcon name="heroicons-solid:building-library" class="size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span>{{ draft.entity || 'Add a payee' }}</span>
                </button>
            </ExpandRow>
            <EntityField
                ref="entityPicker"
                hide-trigger
                :model-value="draft.entity"
                :is-income="false"
                :suggestions="entitySuggestions"
                @update:model-value="handleEntitySelect"
            />

            <!-- Notes. Hidden while collapsed when empty. -->
            <ExpandRow :open="isOpen || !!draft.notes" :expanded="isOpen">
                <div v-if="editing.notes" class="flex items-start gap-1.5">
                    <UIcon name="fa7-solid:comment-dots" class="mt-2.5 size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <!-- 16px text: iOS zooms the page when a smaller field is focused. -->
                    <UTextarea
                        v-model="draft.notes"
                        class="flex-1"
                        :ui="{ base: 'text-base' }"
                        highlight
                        color="info"
                        placeholder="Add notes..."
                        :rows="3"
                        autofocus
                        aria-label="Notes"
                    />
                </div>
                <button
                    v-else
                    type="button"
                    class="flex items-start gap-1.5 text-left text-xs disabled:cursor-default"
                    :class="[draft.notes ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600', isOpen ? 'cursor-pointer' : 'pointer-events-none']"
                    aria-label="Edit notes"
                    @click="startField('notes')"
                >
                    <UIcon name="fa7-solid:comment-dots" class="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span class="whitespace-pre-wrap">{{ draft.notes || 'Add notes' }}</span>
                </button>
            </ExpandRow>

            <!-- Date: only while expanded. A native date input sits over the text, so one tap opens the picker. -->
            <ExpandRow :open="isOpen" :expanded="isOpen">
                <div class="relative inline-flex items-center gap-1.5 text-xs text-gray-400">
                    <UIcon name="fa7-solid:calendar" class="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{{ formatDate(draft.date) }}</span>
                    <input
                        type="date"
                        :value="draft.date"
                        aria-label="Edit date"
                        class="absolute inset-0 h-full w-full text-base opacity-0"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        tabindex="-1"
                        @click="onDateClick"
                        @change="onDateChange"
                    />
                </div>
            </ExpandRow>

            <!-- Account: only while expanded -->
            <ExpandRow :open="isOpen" :expanded="isOpen">
                <div v-if="editing.account" class="flex items-center gap-2">
                    <USelect
                        v-model="accountChoice"
                        class="flex-1"
                        :items="accountOptions"
                        color="info"
                        aria-label="Account"
                    />
                </div>
                <div v-else class="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        class="flex items-center gap-1.5 disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        aria-label="Edit account"
                        @click="startField('account')"
                    >
                        <template v-if="accountName">
                            <UIcon name="fa7-solid:credit-card" class="size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                            <span class="text-xs text-gray-400">{{ accountName }}</span>
                        </template>
                        <span v-else class="text-xs text-gray-300 dark:text-gray-600">Add an account</span>
                    </button>
                </div>
            </ExpandRow>

            <!-- Tags (up to 3; tapping opens the picker). Hidden while collapsed when empty. -->
            <ExpandRow :open="isOpen || draft.tags.length > 0" :expanded="isOpen">
                <button
                    type="button"
                    class="flex w-full items-start gap-1.5 text-left text-xs disabled:cursor-default"
                    :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                    aria-label="Edit tags"
                    @click="openTagPicker"
                >
                    <UIcon name="fa7-solid:tag" class="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <TagChips v-if="draft.tags.length" :names="draft.tags" />
                    <span v-else class="text-gray-300 dark:text-gray-600">Add tags</span>
                </button>
            </ExpandRow>
            <TagField ref="tagPicker" :model-value="draft.tags" @update:model-value="handleTagsSelect" />

            <!-- Who created the expense (not editable, not indented), and the edit icon that becomes the green save check -->
            <div
                class="flex items-end justify-between gap-2 transition-[padding] duration-300 ease-out motion-reduce:transition-none"
                :class="isOpen ? 'pt-4' : 'pt-1.5'"
            >
                <div v-if="creator?.firstName" class="flex min-w-0 items-center gap-1.5">
                    <img
                        v-if="creator.avatarLink"
                        :src="creator.avatarLink"
                        :alt="creator.firstName"
                        class="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                    <div
                        v-else
                        class="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0"
                    >
                        <span class="text-[8px] font-bold text-primary-600 dark:text-primary-300 leading-none select-none">
                            {{ creator.firstName.charAt(0).toUpperCase() }}
                        </span>
                    </div>
                    <span class="truncate text-xs text-gray-400">{{ creator.firstName }}</span>
                </div>
                <span v-else />

                <div class="-mb-1 -mr-1 flex shrink-0 items-center">
                    <!-- The check appears once something has changed and pushes the cancel icon left. -->
                    <div
                        class="overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none"
                        :class="isOpen && dirty ? 'max-w-8 opacity-100' : 'max-w-0 opacity-0'"
                        :inert="!(isOpen && dirty)"
                    >
                        <button
                            type="button"
                            class="flex size-8 cursor-pointer items-center justify-center rounded-full disabled:cursor-default"
                            aria-label="Save changes"
                            :disabled="saving"
                            @click="saveAll"
                        >
                            <UIcon v-if="saving" name="heroicons-solid:arrow-path" class="size-6 animate-spin text-gray-400" />
                            <UIcon v-else name="heroicons-solid:check-circle" class="size-7 text-green-500" />
                        </button>
                    </div>
                    <button
                        v-if="isOpen"
                        type="button"
                        class="flex size-8 cursor-pointer items-center justify-center rounded-full disabled:cursor-default"
                        aria-label="Cancel changes"
                        :disabled="saving"
                        @click="cancel"
                    >
                        <UIcon name="heroicons-solid:x-circle" class="size-7 text-gray-400" />
                    </button>
                    <button
                        v-else
                        type="button"
                        class="flex size-8 cursor-pointer items-center justify-center rounded-full"
                        aria-label="Edit expense"
                    >
                        <UIcon name="heroicons-solid:pencil-square" class="size-5 text-gray-400" />
                    </button>
                </div>
            </div>
        </UCard>
    </div>
</template>
