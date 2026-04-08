<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '~/stores/accounts'
import { getSupabase } from '~/composables/supabase/client'
import { signOut } from '~/composables/supabase'

useHead({ title: 'Profile | R&J Finance' })

// --- Profile image ---
const { app: { baseURL } } = useRuntimeConfig()
const profileImageSrc = computed(() => `${baseURL}AU1A4287.jpg`)

// --- User ---
const userName = ref('')
const userEmail = ref('')
onMounted(async () => {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  userName.value = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  userEmail.value = user?.email || ''
})

// --- State ---
const accountsStore = useAccountsStore()
const { accounts, loading, error } = storeToRefs(accountsStore)

// Create modal
const isCreateOpen = ref(false)
const createLoading = ref(false)
const createName = ref('')
const createInstitution = ref('')
const createBaseline = ref('')
const createCardNumber = ref('')
const createIsCreditCard = ref(false)
const createIsDefaultForExpenses = ref(false)
const createIsDefaultForIncome = ref(false)

// Detail / edit modal
const isDetailOpen = ref(false)
const selectedAccount = ref<any | null>(null)
const editLoading = ref(false)
const baselineLoading = ref(false)
const deleteLoading = ref(false)
const editTab = ref('details')
const editName = ref('')
const editInstitution = ref('')
const editBaseline = ref('')
const editCardNumber = ref('')
const editIsCreditCard = ref(false)
const editIsDefaultForExpenses = ref(false)
const editIsDefaultForIncome = ref(false)

const editTabItems = [
  { label: 'Account', value: 'details', slot: 'details', icon: 'heroicons-solid:pencil-square' },
  { label: 'Baseline', value: 'baseline', slot: 'baseline', icon: 'heroicons-solid:banknotes' },
]

const accountMenuItems = [[
  {
    label: 'Add account',
    icon: 'heroicons-solid:plus-circle',
    onSelect: () => openCreate()
  }
]]

onMounted(() => {
  accountsStore.ensureLoaded()
})

// --- Create ---
function openCreate() {
  createName.value = ''
  createInstitution.value = ''
  createBaseline.value = ''
  createCardNumber.value = ''
  createIsCreditCard.value = false
  createIsDefaultForExpenses.value = false
  createIsDefaultForIncome.value = false
  isCreateOpen.value = true
}

function closeCreate() {
  isCreateOpen.value = false
}

async function handleCreate() {
  if (!createName.value.trim() && !createInstitution.value.trim()) {
    alert('Please enter at least a name or institution.')
    return
  }
  createLoading.value = true
  try {
    await accountsStore.addAccount(createName.value, createInstitution.value, createBaseline.value, createCardNumber.value, createIsCreditCard.value, createIsDefaultForExpenses.value, createIsDefaultForIncome.value)
    closeCreate()
  } catch (e: any) {
    alert('Error creating account: ' + (e?.message || 'Unknown error'))
  } finally {
    createLoading.value = false
  }
}

// --- Detail / edit ---
function openDetail(account: any) {
  selectedAccount.value = account
  editTab.value = 'details'
  editName.value = account.name ?? ''
  editInstitution.value = account.institution ?? ''
  editBaseline.value = account.baseline_amount != null ? String(account.baseline_amount) : ''
  editCardNumber.value = account.card_number ?? ''
  editIsCreditCard.value = account.is_credit_card ?? false
  editIsDefaultForExpenses.value = account.is_default_for_expenses ?? false
  editIsDefaultForIncome.value = account.is_default_for_income ?? false
  isDetailOpen.value = true
}

function closeDetail() {
  isDetailOpen.value = false
}

async function handleUpdate() {
  if (!selectedAccount.value) return
  if (!editName.value.trim() && !editInstitution.value.trim()) {
    alert('Please enter at least a name or institution.')
    return
  }
  editLoading.value = true
  try {
    const updated = await accountsStore.editAccount(selectedAccount.value.id, editName.value, editInstitution.value, editCardNumber.value, editIsCreditCard.value, editIsDefaultForExpenses.value, editIsDefaultForIncome.value)
    selectedAccount.value = updated
    closeDetail()
  } catch (e: any) {
    alert('Error updating account: ' + (e?.message || 'Unknown error'))
  } finally {
    editLoading.value = false
  }
}

async function handleBaselineUpdate() {
  if (!selectedAccount.value) return
  baselineLoading.value = true
  try {
    const updated = await accountsStore.editAccountBaseline(selectedAccount.value.id, editBaseline.value)
    if (updated) {
      selectedAccount.value = updated
      editBaseline.value = updated.baseline_amount != null ? String(updated.baseline_amount) : ''
    }
    closeDetail()
  } catch (e: any) {
    alert('Error updating baseline amount: ' + (e?.message || 'Unknown error'))
  } finally {
    baselineLoading.value = false
  }
}

async function handleDelete() {
  if (!selectedAccount.value) return
  if (!confirm(`Delete "${selectedAccount.value.name || selectedAccount.value.institution || 'this account'}"?`)) return
  deleteLoading.value = true
  try {
    await accountsStore.removeAccount(selectedAccount.value.id)
    closeDetail()
  } catch (e: any) {
    alert('Error deleting account: ' + (e?.message || 'Unknown error'))
  } finally {
    deleteLoading.value = false
  }
}

// --- Default-conflict computed helpers ---
// Returns the account (other than the one currently being edited) that holds each default.
const existingDefaultExpenses = computed(() =>
  accounts.value.find((a: any) => a.is_default_for_expenses && a.id !== selectedAccount.value?.id) ?? null
)
const existingDefaultIncome = computed(() =>
  accounts.value.find((a: any) => a.is_default_for_income && a.id !== selectedAccount.value?.id) ?? null
)

// For the create form: any account already holding the default blocks it.
const createExpensesDisabled = computed(() =>
  accounts.value.some((a: any) => a.is_default_for_expenses)
)
const createIncomeDisabled = computed(() =>
  accounts.value.some((a: any) => a.is_default_for_income)
)

// For the edit form: only block if a *different* account holds the default and the
// current account is not already checked (i.e. the user can still uncheck their own).
const editExpensesDisabled = computed(() =>
  !!existingDefaultExpenses.value && !editIsDefaultForExpenses.value
)
const editIncomeDisabled = computed(() =>
  !!existingDefaultIncome.value && !editIsDefaultForIncome.value
)

function defaultHolderName(account: any | null): string {
  if (!account) return ''
  return account.name || account.institution || 'another account'
}

// --- Helpers ---
function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
}

function maskedCard(cardNumber: string | null | undefined) {
  if (!cardNumber) return null
  const last4 = cardNumber.replace(/\s/g, '').slice(-4)
  return `•••• ${last4}`
}

function institutionIcon(institution: string | null | undefined) {
  if (!institution) return 'heroicons-solid:credit-card'
  const name = institution.toLowerCase()
  if (name.includes('bmo')) return 'heroicons-solid:building-library'
  if (name.includes('scotia') || name.includes('bank')) return 'heroicons-solid:building-library'
  if (name.includes('quest') || name.includes('invest')) return 'heroicons-solid:chart-bar'
  if (name.includes('visa') || name.includes('mastercard') || name.includes('card')) return 'heroicons-solid:credit-card'
  return 'heroicons-solid:banknotes'
}

function institutionBgColor(institution: string | null | undefined) {
  if (!institution) return 'bg-primary-100 dark:bg-primary-900'
  const name = institution.toLowerCase()
  if (name === 'bmo') return 'bg-secondary-100 dark:bg-secondary-900'
  if (name === 'scotiabank') return 'bg-error-100 dark:bg-error-900'
  if (name.includes('questrade')) return 'bg-primary-100 dark:bg-primary-900'
  return 'bg-primary-100 dark:bg-primary-900'
}
</script>

<template>
  <UContainer>
    <!-- Profile Header -->
    <div class="relative flex flex-col items-center pt-8 pb-6 mb-2">
      <!-- Top-right actions -->
      <div class="absolute top-0 right-0 flex items-center gap-2">
        <UColorModeSwitch />
        <UButton color="neutral" variant="ghost" size="sm" icon="heroicons-solid:arrow-right-on-rectangle" aria-label="Sign out" @click="signOut()" />
      </div>
      <!-- Profile image -->
      <img :src="profileImageSrc" alt="Profile" class="w-58 h-58 rounded-full object-cover mb-3 ring-4 ring-white dark:ring-gray-800 shadow-lg" />
      <!-- User name / email -->
      <p class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ userName || userEmail || 'User' }}
      </p>
      <p v-if="userName && userEmail" class="text-sm text-gray-400 mt-0.5">{{ userEmail }}</p>
    </div>

    <!-- Accounts subheading + menu -->
    <div class="relative flex items-center justify-center mb-4">
      <h2 class="text-2xl font-bold">Accounts</h2>
      <div class="absolute right-0">
        <UDropdownMenu :items="accountMenuItems" :content="{ align: 'end' }">
          <UButton
            color="neutral"
            variant="ghost"
            icon="heroicons-solid:ellipsis-vertical"
            size="md"
            aria-label="Accounts menu"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4">
      <UAlert title="Error" :description="error" color="error" variant="soft" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-400">Loading accounts...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="accounts.length === 0" class="text-center py-12">
      <UIcon name="heroicons-solid:credit-card" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-400">No accounts yet. Tap the button to add one.</p>
    </div>

    <!-- Account list -->
    <div v-else class="grid grid-cols-1 gap-3 pb-36">
      <UCard
        v-for="account in accounts"
        :key="account.id"
        class="cursor-pointer active:scale-[0.98] transition-transform shadow"
        @click="openDetail(account)"
      >
        <div class="flex items-center gap-4">
          <div :class="['shrink-0 w-10 h-10 rounded-full flex items-center justify-center', institutionBgColor(account.institution)]">
            <img v-if="account.institution?.toLowerCase() === 'bmo'" src="@/assets/images/BMO.png" alt="BMO" class="w-6 h-6" />
            <img v-else-if="account.institution?.toLowerCase().includes('questrade')" src="@/assets/images/Questrade.png" alt="Questrade" class="w-6 h-6" />
            <img v-else-if="account.institution?.toLowerCase() === 'scotiabank'" src="@/assets/images/Scotiabank.JPG" alt="Scotiabank" class="w-6 h-6" />
            <UIcon v-else :name="institutionIcon(account.institution)" class="w-5 h-5 text-primary-500" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">{{ account.name || account.institution || 'Unnamed Account' }}</p>
            <p v-if="account.institution && account.name" class="text-xs truncate">{{ account.institution }}</p>
          </div>
          <div class="text-right shrink-0">
            <p v-if="account.card_number" class="text-xs text-gray-400">{{ maskedCard(account.card_number) }}</p>
            <p v-else class="text-xs text-gray-400">—</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ===== Create Modal / Slideover ===== -->
    <USlideover v-model:open="isCreateOpen" class="w-full sm:max-w-md">
      <template #content>
        <div class="flex flex-col h-full">
          <div class="flex-1 p-6 overflow-y-auto">
            <h3 class="text-2xl font-bold mb-6">Add Account</h3>
            <div class="space-y-5">
              <UFormField label="Account Name">
                <UInput v-model="createName" placeholder="e.g., Chequing" size="xl" />
              </UFormField>
              <UFormField label="Institution">
                <UInput v-model="createInstitution" placeholder="e.g., BMO" size="xl" />
              </UFormField>
              <UFormField label="Baseline Amount">
                <UInput v-model="createBaseline" placeholder="0.00" type="number" step="0.01" size="xl" />
              </UFormField>
              <UFormField label="Card Number (last 4 or full)">
                <UInput v-model="createCardNumber" placeholder="e.g., 1234" size="xl" />
              </UFormField>
              <div class="space-y-3 pt-1">
                <UCheckbox v-model="createIsCreditCard" label="Credit card" />
                <div>
                  <UCheckbox
                    v-model="createIsDefaultForExpenses"
                    :disabled="createExpensesDisabled"
                    label="Default account for expenses"
                  />
                  <p v-if="createExpensesDisabled" class="text-xs text-gray-400 mt-1 ml-6">
                    Already set to {{ defaultHolderName(accounts.find((a: any) => a.is_default_for_expenses) ?? null) }}
                  </p>
                </div>
                <div>
                  <UCheckbox
                    v-model="createIsDefaultForIncome"
                    :disabled="createIncomeDisabled"
                    label="Default account for income"
                  />
                  <p v-if="createIncomeDisabled" class="text-xs text-gray-400 mt-1 ml-6">
                    Already set to {{ defaultHolderName(accounts.find((a: any) => a.is_default_for_income) ?? null) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-6 border-t">
            <div class="flex gap-3">
              <UButton color="primary" class="flex-1" size="lg" :loading="createLoading" :disabled="createLoading" @click="handleCreate">
                Add Account
              </UButton>
              <UButton color="neutral" variant="outline" class="flex-1" size="lg" :disabled="createLoading" @click="closeCreate">
                Cancel
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- ===== Detail / Edit Modal ===== -->
    <UModal v-model:open="isDetailOpen">
      <template #content>
        <div v-if="selectedAccount" class="p-6 space-y-5">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xl font-bold">Edit Account</h3>
            <UButton
              color="error"
              variant="ghost"
              icon="heroicons-solid:trash"
              size="sm"
              :loading="deleteLoading"
              :disabled="deleteLoading || editLoading || baselineLoading"
              @click="handleDelete"
              aria-label="Delete account"
            />
          </div>

          <UTabs v-model="editTab" color="primary" :items="editTabItems">
            <template #details>
              <div class="space-y-5 pt-4">
                <UFormField label="Account Name">
                  <UInput v-model="editName" placeholder="e.g., Chequing" size="xl" />
                </UFormField>
                <UFormField label="Institution">
                  <UInput v-model="editInstitution" placeholder="e.g., BMO" size="xl" />
                </UFormField>
                <UFormField label="Card Number (last 4 or full)">
                  <UInput v-model="editCardNumber" placeholder="e.g., 1234" size="xl" />
                </UFormField>
                <div class="space-y-3">
                  <UCheckbox v-model="editIsCreditCard" label="Credit card" />
                  <div>
                    <UCheckbox
                      v-model="editIsDefaultForExpenses"
                      :disabled="editExpensesDisabled"
                      label="Default account for expenses"
                    />
                    <p v-if="editExpensesDisabled" class="text-xs text-gray-400 mt-1 ml-6">
                      Already set to {{ defaultHolderName(existingDefaultExpenses) }}
                    </p>
                  </div>
                  <div>
                    <UCheckbox
                      v-model="editIsDefaultForIncome"
                      :disabled="editIncomeDisabled"
                      label="Default account for income"
                    />
                    <p v-if="editIncomeDisabled" class="text-xs text-gray-400 mt-1 ml-6">
                      Already set to {{ defaultHolderName(existingDefaultIncome) }}
                    </p>
                  </div>
                </div>

                <div class="flex gap-3 pt-2">
                  <UButton color="primary" class="flex-1" size="lg" :loading="editLoading" :disabled="editLoading || deleteLoading || baselineLoading" @click="handleUpdate">
                    Save Changes
                  </UButton>
                  <UButton color="neutral" variant="outline" class="flex-1" size="lg" :disabled="editLoading || deleteLoading || baselineLoading" @click="closeDetail">
                    Cancel
                  </UButton>
                </div>
              </div>
            </template>

            <template #baseline>
              <div class="space-y-5 pt-4">
                <UFormField label="Baseline Amount">
                  <UInput v-model="editBaseline" placeholder="0.00" type="number" step="0.01" size="xl" />
                </UFormField>

                <p class="text-sm text-gray-400">
                  This updates only the baseline amount stored for this account.
                </p>

                <div class="flex gap-3 pt-2">
                  <UButton color="primary" class="flex-1" size="lg" :loading="baselineLoading" :disabled="baselineLoading || deleteLoading || editLoading" @click="handleBaselineUpdate">
                    Update Baseline
                  </UButton>
                  <UButton color="neutral" variant="outline" class="flex-1" size="lg" :disabled="baselineLoading || deleteLoading || editLoading" @click="closeDetail">
                    Cancel
                  </UButton>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
