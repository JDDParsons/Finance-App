<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useInstitutionBranding } from '~/composables/useInstitutionBranding'
import { getMissingBudgetPeriodMessage } from '~/utils/budgetErrors'
import { accountDisplayName } from '../../utils/accountAppearance'

const props = defineProps<{
    expenseId: string
    expenseAmount?: number
    expenseDate?: string
    expenseEntity?: string | null
    expenseNotes?: string | null
    expenseBudgetId?: string | null
    expenseAccountId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()
const { institutionLogo, institutionIcon, institutionBgClass } = useInstitutionBranding()
const existingHit = computed(() => store.budgetHits.find((h: any) => h.id === props.expenseId) ?? null)

// The values shown. Each one changes only after its own save succeeds.
const amount = ref(props.expenseAmount ?? 0)
const date = ref(props.expenseDate ? props.expenseDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const entity = ref(props.expenseEntity ?? '')
const notes = ref(props.expenseNotes ?? existingHit.value?.notes ?? '')
const noBudget = ref(!props.expenseBudgetId)
const selectedBudgetId = ref(props.expenseBudgetId ?? '')
const choosingBudget = ref(false)

const immutableAccountId = computed<string | null>(() => {
    if (props.expenseAccountId !== undefined) return props.expenseAccountId
    return existingHit.value?.account_id ?? null
})
const selectedAccountId = ref<string>(immutableAccountId.value ?? '__none__')

const deleting = ref(false)
const error = ref<string | null>(null)

// Only one field is edited at a time. While it is, the other pencils are hidden.
type EditableField = 'amount' | 'date' | 'notes' | 'account'
const activeField = ref<EditableField | null>(null)
const draft = ref('')
const saving = ref(false)
const entityPicker = ref<{ open: () => void } | null>(null)

const chosenBudget = computed(() => {
    if (noBudget.value) return null
    return store.budgets.find((b: any) => b.id === selectedBudgetId.value) ?? null
})

const budgetColor = computed<string | null>(() => chosenBudget.value?.color ?? null)
const borderColor = computed(() => budgetColor.value || '#E5E7EB')

const chosenAccount = computed(() => store.accounts.find((a: any) => a.id === selectedAccountId.value) ?? null)
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
    const userId = existingHit.value?.user_id
    return userId ? store.userProfiles.get(userId) ?? null : null
})

// Existing payees for the chosen budget, the same suggestions the create flow shows.
const entitySuggestions = computed((): string[] => {
    if (noBudget.value || !selectedBudgetId.value) return []
    return store.budgetAllEntities.get(selectedBudgetId.value) ?? []
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

// Saves the whole record with one field changed. The shown values change only on success.
async function commit(patch: Partial<ExpenseValues>): Promise<boolean> {
    const next: ExpenseValues = {
        amount: amount.value,
        date: date.value,
        entity: entity.value,
        notes: notes.value,
        budgetId: noBudget.value ? null : (selectedBudgetId.value || null),
        accountId: selectedAccountId.value === '__none__' ? null : selectedAccountId.value,
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
        amount.value = Number(next.amount)
        date.value = next.date
        entity.value = next.entity
        notes.value = next.notes
        selectedBudgetId.value = next.budgetId ?? ''
        noBudget.value = !next.budgetId
        selectedAccountId.value = next.accountId ?? '__none__'
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
    if (activeField.value || saving.value) return
    error.value = null
    draft.value = field === 'amount' ? String(amount.value)
        : field === 'date' ? date.value
        : field === 'notes' ? notes.value
        : selectedAccountId.value
    activeField.value = field
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
    } else if (field === 'date') {
        if (!draft.value) {
            error.value = 'Please select a date'
            return
        }
        if (draft.value === date.value) { activeField.value = null; return }
        patch = { date: draft.value }
    } else if (field === 'notes') {
        if (draft.value === notes.value) { activeField.value = null; return }
        patch = { notes: draft.value }
    } else {
        if (draft.value === selectedAccountId.value) { activeField.value = null; return }
        patch = { accountId: draft.value === '__none__' ? null : draft.value }
    }

    if (await commit(patch)) activeField.value = null
}

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
    choosingBudget.value = false
    const budgetId = selection.noBudget ? null : selection.budgetId
    if (budgetId === (noBudget.value ? null : (selectedBudgetId.value || null))) return
    void commit({ budgetId })
}

function openEntityPicker() {
    if (activeField.value || saving.value) return
    const budgetId = selectedBudgetId.value
    if (!noBudget.value && budgetId && !store.budgetAllEntities.has(budgetId)) {
        // Offline or failed: the picker still works with typed names.
        store.fetchBudgetEntities(budgetId).catch(() => {})
    }
    entityPicker.value?.open()
}

function handleEntitySelect(value: string) {
    if (value === entity.value) return
    void commit({ entity: value })
}

function startBudgetChange() {
    if (activeField.value || saving.value) return
    error.value = null
    choosingBudget.value = true
}

function cancelBudgetChange() {
    choosingBudget.value = false
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return
    try {
        deleting.value = true
        error.value = null
        await store.removeExpense(props.expenseId)
        emit('delete')
    } catch (err: any) {
        error.value = err?.message || 'Error deleting expense'
        console.error('Error deleting expense:', err)
        deleting.value = false
    }
}
</script>

<template>
    <!-- Choose budget page -->
    <UCard v-if="choosingBudget">
        <BudgetsChooseBudget
            :budgets="store.budgets"
            :expenses-only="true"
            @select="handleBudgetSelect"
        />
        <div class="mt-4">
            <UButton color="neutral" variant="ghost" @click="cancelBudgetChange">Cancel</UButton>
        </div>
    </UCard>

    <!-- The expense, laid out like its card; each field has its own edit icon -->
    <UCard
        v-else
        class="shadow"
        :style="{ borderLeft: `4px solid ${borderColor}` }"
    >
        <div class="flex flex-col gap-1.5">
            <div class="-mt-1 flex items-center justify-end gap-1">
                <UButton
                    icon="heroicons-solid:trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="Delete expense"
                    :disabled="saving || deleting"
                    @click="handleDelete"
                />
                <UButton
                    icon="heroicons:x-mark"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    aria-label="Close"
                    @click="emit('cancel')"
                />
            </div>

            <div v-if="error" role="alert">
                <UAlert title="Error" :description="error" color="error" variant="soft" />
            </div>

            <!-- Amount -->
            <div class="flex items-center gap-2">
                <UInput
                    v-if="activeField === 'amount'"
                    v-model="draft"
                    class="flex-1"
                    highlight
                    color="info"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    size="lg"
                    aria-label="Amount"
                    @keydown.enter.prevent="confirmField"
                />
                <span v-else class="flex-1 text-xl font-semibold text-info">{{ formatCurrency(amount) }}</span>
                <FieldEditButton label="amount" :editing="activeField === 'amount'" :locked="!!activeField" :saving="saving" @edit="startField('amount')" @confirm="confirmField" />
            </div>

            <!-- Date -->
            <div class="flex items-center gap-2">
                <UInput
                    v-if="activeField === 'date'"
                    v-model="draft"
                    class="flex-1"
                    highlight
                    color="info"
                    type="date"
                    aria-label="Date"
                />
                <span v-else class="flex-1 text-sm text-gray-400">{{ formatDate(date) }}</span>
                <FieldEditButton label="date" :editing="activeField === 'date'" :locked="!!activeField" :saving="saving" @edit="startField('date')" @confirm="confirmField" />
            </div>

            <!-- Budget -->
            <div class="flex items-center gap-2">
                <div class="flex flex-1 items-center gap-2">
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
                    <span class="text-sm text-gray-600 dark:text-gray-300">{{ chosenBudget?.name ?? 'No budget' }}</span>
                </div>
                <FieldEditButton label="budget" :editing="false" :locked="!!activeField" @edit="startBudgetChange" />
            </div>

            <!-- Payee -->
            <div class="flex items-center gap-2">
                <span v-if="entity" class="flex-1 text-sm text-gray-600 dark:text-gray-300">{{ entity }}</span>
                <span v-else class="flex-1 text-sm text-gray-400 dark:text-gray-500">No payee</span>
                <FieldEditButton label="payee" :editing="false" :locked="!!activeField" @edit="openEntityPicker" />
            </div>
            <EntityField
                ref="entityPicker"
                hide-trigger
                :model-value="entity"
                :is-income="false"
                :suggestions="entitySuggestions"
                @update:model-value="handleEntitySelect"
            />

            <!-- Notes -->
            <div class="flex items-center gap-2" :class="activeField === 'notes' ? 'items-start' : ''">
                <UTextarea
                    v-if="activeField === 'notes'"
                    v-model="draft"
                    class="flex-1"
                    highlight
                    color="info"
                    placeholder="Add notes..."
                    :rows="3"
                    aria-label="Notes"
                />
                <span v-else-if="notes" class="flex-1 whitespace-pre-wrap text-xs text-gray-400 dark:text-gray-500">{{ notes }}</span>
                <span v-else class="flex-1 text-xs text-gray-300 dark:text-gray-600">No notes</span>
                <FieldEditButton label="notes" :editing="activeField === 'notes'" :locked="!!activeField" :saving="saving" @edit="startField('notes')" @confirm="confirmField" />
            </div>

            <!-- Account -->
            <div class="flex items-center gap-2">
                <USelect
                    v-if="activeField === 'account'"
                    v-model="draft"
                    class="flex-1"
                    :items="accountOptions"
                    color="info"
                    aria-label="Account"
                />
                <div v-else class="flex flex-1 items-center gap-1.5">
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
                    <span v-else class="text-xs text-gray-400">No account</span>
                </div>
                <FieldEditButton label="account" :editing="activeField === 'account'" :locked="!!activeField" :saving="saving" @edit="startField('account')" @confirm="confirmField" />
            </div>

            <!-- Created by (not editable) -->
            <div v-if="creator?.firstName" class="flex items-center gap-1.5">
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
    </UCard>
</template>
