<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useInstitutionBranding } from '~/composables/useInstitutionBranding'
import { getMissingBudgetPeriodMessage } from '~/utils/budgetErrors'
import { accountDisplayName } from '../../utils/accountAppearance'

// An expense as a card. Tapping it expands it in place: the spacing between fields
// grows, empty fields show as "Add ..." prompts, and each field can be tapped to edit
// just that field. Tapping the card away from a field collapses it again. Dragging the
// card left reveals Delete. With `modal` the card is always expanded (used inside a modal).
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
const { institutionLogo, institutionIcon, institutionBgClass } = useInstitutionBranding()

// Everything shown comes from the expense in the store, so the card follows refreshes,
// queued changes and edits made elsewhere.
const hit = computed(() => store.budgetHits.find((h: any) => h.id === props.expenseId) ?? null)
const isOpen = computed(() => !!props.modal || expanded.value)

const amount = computed(() => hit.value?.amount ?? 0)
const date = computed(() => (hit.value?.date ?? '').slice(0, 10))
const entity = computed<string>(() => hit.value?.entity ?? '')
const notes = computed<string>(() => hit.value?.notes ?? '')
const budgetId = computed<string | null>(() => hit.value?.budget_id ?? null)
const accountId = computed<string | null>(() => hit.value?.account_id ?? null)

const deleting = ref(false)
const error = ref<string | null>(null)

// Only one field is edited at a time. While it is, the other fields cannot be tapped.
type EditableField = 'amount' | 'notes' | 'account'
const activeField = ref<EditableField | null>(null)
const draft = ref('')
const saving = ref(false)
const choosingBudget = ref(false)
const entityPicker = ref<{ open: () => void } | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

const chosenBudget = computed(() => budgetId.value ? store.budgets.find((b: any) => b.id === budgetId.value) ?? null : null)
const budgetColor = computed<string | null>(() => chosenBudget.value?.color ?? null)
const borderColor = computed(() => budgetColor.value || '#E5E7EB')

const chosenAccount = computed(() => accountId.value ? store.accounts.find((a: any) => a.id === accountId.value) ?? null : null)
const accountName = computed(() => chosenAccount.value ? accountDisplayName(chosenAccount.value) : null)
const accountInstitution = computed<string | null>(() => chosenAccount.value?.institution ?? null)

const accountOptions = computed(() => [
    { label: 'No account', value: '__none__' },
    ...store.accounts.map((a: any) => ({
        label: accountDisplayName(a),
        value: a.id,
    }))
])

const creator = computed(() => {
    const userId = hit.value?.user_id
    return userId ? store.userProfiles.get(userId) ?? null : null
})

// Existing payees for the chosen budget, the same suggestions the create flow shows.
const entitySuggestions = computed((): string[] => {
    if (!budgetId.value) return []
    return store.budgetAllEntities.get(budgetId.value) ?? []
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

interface ExpenseValues {
    amount: number | string
    date: string
    entity: string
    notes: string
    budgetId: string | null
    accountId: string | null
}

// Saves the whole record with one field changed.
async function commit(patch: Partial<ExpenseValues>): Promise<boolean> {
    const next: ExpenseValues = {
        amount: amount.value,
        date: date.value,
        entity: entity.value,
        notes: notes.value,
        budgetId: budgetId.value,
        accountId: accountId.value,
        ...patch,
    }
    saving.value = true
    error.value = null
    try {
        await store.updateExpense(
            props.expenseId,
            next.budgetId,
            next.date,
            String(next.amount),
            next.entity,
            next.accountId,
            next.notes
        )
        return true
    } catch (err: any) {
        const budgetName = store.budgets.find((b: any) => b.id === next.budgetId)?.name ?? chosenBudget.value?.name ?? 'This budget'
        error.value = getMissingBudgetPeriodMessage(err, budgetName, next.date)
            || err?.message
            || 'Error updating expense'
        console.error('Error updating expense:', err)
        return false
    } finally {
        saving.value = false
    }
}

function startField(field: EditableField) {
    if (!isOpen.value || activeField.value || saving.value) return
    error.value = null
    draft.value = field === 'amount' ? String(amount.value)
        : field === 'notes' ? notes.value
        : (accountId.value ?? '__none__')
    activeField.value = field
    if (field === 'amount') nextTick(() => amountInput.value?.focus())
}

// The check icon: saves the field being edited, or just closes it when nothing changed.
async function confirmField() {
    const field = activeField.value
    if (!field || saving.value) return

    let patch: Partial<ExpenseValues>
    if (field === 'amount') {
        const value = Number(draft.value)
        if (!String(draft.value).trim() || !Number.isFinite(value) || value === 0) {
            error.value = 'Please enter an amount'
            return
        }
        if (value === Number(amount.value)) { activeField.value = null; return }
        patch = { amount: value }
    } else if (field === 'notes') {
        if (draft.value === notes.value) { activeField.value = null; return }
        patch = { notes: draft.value }
    } else {
        const next = draft.value === '__none__' ? null : draft.value
        if (next === accountId.value) { activeField.value = null; return }
        patch = { accountId: next }
    }

    if (await commit(patch)) activeField.value = null
}

// The date is a native date input laid over the date text, so one tap opens the picker
// and choosing a date saves it right away.
function onDateClick(event: MouseEvent) {
    try { (event.target as HTMLInputElement).showPicker?.() } catch { /* the browser decides */ }
}

function onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value
    if (!value || value === date.value) return
    void commit({ date: value })
}

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
    choosingBudget.value = false
    const next = selection.noBudget ? null : selection.budgetId
    if (next === budgetId.value) return
    void commit({ budgetId: next })
}

function closeBudgetPicker() {
    choosingBudget.value = false
}

function startBudgetChange() {
    if (!isOpen.value || activeField.value || saving.value) return
    error.value = null
    choosingBudget.value = true
}

function openEntityPicker() {
    if (!isOpen.value || activeField.value || saving.value) return
    const id = budgetId.value
    if (id && !store.budgetAllEntities.has(id)) {
        // Offline or failed: the picker still works with typed names.
        store.fetchBudgetEntities(id).catch(() => {})
    }
    entityPicker.value?.open()
}

function handleEntitySelect(value: string) {
    if (value === entity.value) return
    void commit({ entity: value })
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

watch(expanded, (open) => {
    if (open) return
    activeField.value = null
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
    if (activeField.value || saving.value) return
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
// - a tap on a collapsed card only expands it
// - a tap on an expanded card away from any field collapses it
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
    if (activeField.value) return
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
                        v-if="activeField === 'amount'"
                        ref="amountInput"
                        v-model="draft"
                        type="number"
                        step="0.01"
                        inputmode="decimal"
                        placeholder="0.00"
                        aria-label="Amount"
                        class="min-w-0 flex-1 border-b border-info/50 bg-transparent text-xl font-semibold text-info outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        @keydown.enter.prevent="confirmField"
                    />
                    <button
                        v-else
                        type="button"
                        class="flex-1 text-left text-xl font-semibold text-info disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        aria-label="Edit amount"
                        :disabled="!!activeField"
                        @click="startField('amount')"
                    >{{ formatCurrency(amount) }}</button>
                    <FieldConfirmButton v-if="activeField === 'amount'" label="amount" :saving="saving" @confirm="confirmField" />

                    <!-- Budget icon: colored circle or grey X pattern for uncategorized -->
                    <button
                        type="button"
                        class="shrink-0 rounded-full disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        :aria-label="`Change budget, currently ${chosenBudget?.name ?? 'No budget'}`"
                        :title="chosenBudget?.name ?? 'No budget'"
                        :disabled="!!activeField"
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

            <!-- Date, under the amount. A native date input sits over the text. -->
            <ExpandRow :expanded="isOpen" collapsed-pad="pt-0" expanded-pad="pt-1">
                <div class="relative inline-block text-xs text-gray-400">
                    <span>{{ formatDate(date) }}</span>
                    <input
                        type="date"
                        :value="date"
                        aria-label="Edit date"
                        class="absolute inset-0 h-full w-full opacity-0"
                        :class="isOpen && !activeField ? 'cursor-pointer' : 'pointer-events-none'"
                        tabindex="-1"
                        @click="onDateClick"
                        @change="onDateChange"
                    />
                </div>
            </ExpandRow>

            <!-- Payee -->
            <ExpandRow :open="isOpen || !!entity" :expanded="isOpen">
                <button
                    type="button"
                    class="text-left text-sm disabled:cursor-default"
                    :class="[entity ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600', isOpen ? 'cursor-pointer' : 'pointer-events-none']"
                    aria-label="Edit payee"
                    :disabled="!!activeField"
                    @click="openEntityPicker"
                >{{ entity || 'Add a payee' }}</button>
            </ExpandRow>
            <EntityField
                ref="entityPicker"
                hide-trigger
                :model-value="entity"
                :is-income="false"
                :suggestions="entitySuggestions"
                @update:model-value="handleEntitySelect"
            />

            <!-- Notes -->
            <ExpandRow :open="isOpen || !!notes" :expanded="isOpen">
                <div v-if="activeField === 'notes'" class="flex items-start gap-2">
                    <UTextarea
                        v-model="draft"
                        class="flex-1"
                        highlight
                        color="info"
                        placeholder="Add notes..."
                        :rows="3"
                        autofocus
                        aria-label="Notes"
                    />
                    <FieldConfirmButton label="notes" :saving="saving" @confirm="confirmField" />
                </div>
                <button
                    v-else
                    type="button"
                    class="whitespace-pre-wrap text-left text-xs disabled:cursor-default"
                    :class="[notes ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600', isOpen ? 'cursor-pointer' : 'pointer-events-none']"
                    aria-label="Edit notes"
                    :disabled="!!activeField"
                    @click="startField('notes')"
                >{{ notes || 'Add notes' }}</button>
            </ExpandRow>

            <!-- Account, and who created the expense (not editable) -->
            <ExpandRow :open="isOpen || !!accountName || !!creator?.firstName" :expanded="isOpen">
                <div v-if="activeField === 'account'" class="flex items-center gap-2">
                    <USelect
                        v-model="draft"
                        class="flex-1"
                        :items="accountOptions"
                        color="info"
                        aria-label="Account"
                    />
                    <FieldConfirmButton label="account" :saving="saving" @confirm="confirmField" />
                </div>
                <div v-else class="flex items-center gap-2 flex-wrap">
                    <button
                        v-if="accountName || isOpen"
                        type="button"
                        class="flex items-center gap-1.5 disabled:cursor-default"
                        :class="isOpen ? 'cursor-pointer' : 'pointer-events-none'"
                        aria-label="Edit account"
                        :disabled="!!activeField"
                        @click="startField('account')"
                    >
                        <template v-if="accountName">
                            <div :class="['shrink-0 w-5 h-5 rounded-full flex items-center justify-center overflow-hidden', institutionBgClass(accountInstitution, accountName)]">
                                <img
                                    v-if="institutionLogo(accountInstitution, accountName)"
                                    :src="institutionLogo(accountInstitution, accountName)!.src"
                                    :alt="institutionLogo(accountInstitution, accountName)!.alt"
                                    class="w-3 h-3 object-contain"
                                />
                                <UIcon v-else :name="institutionIcon(accountInstitution, accountName)" class="w-3 h-3 text-primary-500" />
                            </div>
                            <span class="text-xs text-gray-400">{{ accountName }}</span>
                        </template>
                        <span v-else class="text-xs text-gray-300 dark:text-gray-600">Add an account</span>
                    </button>

                    <div v-if="creator?.firstName" class="flex items-center gap-1.5 ml-auto">
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
                        <span class="text-xs text-gray-400">{{ creator.firstName }}</span>
                    </div>
                </div>
            </ExpandRow>
        </UCard>
    </div>
</template>
