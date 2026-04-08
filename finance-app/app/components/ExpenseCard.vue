<script setup lang="ts">
const props = defineProps<{
  id: string
  amount: number | null
  date: string | null
  note?: string | null
  budgetName?: string | null
  budgetColor?: string | null
  accountName?: string | null
  accountInstitution?: string | null
}>()

const emit = defineEmits<{
  delete: [id: string]
  edit: [id: string]
}>()

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function normalizedInstitution(institution: string | null | undefined, accountName: string | null | undefined) {
  return (institution || accountName || '').toLowerCase()
}

function institutionIcon(institution: string | null | undefined, accountName: string | null | undefined) {
  const name = normalizedInstitution(institution, accountName)
  if (!name) return 'heroicons-solid:credit-card'
  if (name.includes('bmo')) return 'heroicons-solid:building-library'
  if (name.includes('scotia') || name.includes('bank')) return 'heroicons-solid:building-library'
  if (name.includes('quest') || name.includes('invest')) return 'heroicons-solid:chart-bar'
  if (name.includes('visa') || name.includes('mastercard') || name.includes('card')) return 'heroicons-solid:credit-card'
  return 'heroicons-solid:banknotes'
}

function institutionBgColor(institution: string | null | undefined, accountName: string | null | undefined) {
  const name = normalizedInstitution(institution, accountName)
  if (!name) return 'bg-primary-100 dark:bg-primary-900'
  if (name.includes('bmo')) return 'bg-secondary-100 dark:bg-secondary-900'
  if (name.includes('scotiabank')) return 'bg-error-100 dark:bg-error-900'
  if (name.includes('questrade')) return 'bg-primary-100 dark:bg-primary-900'
  return 'bg-primary-100 dark:bg-primary-900'
}
</script>

<template>
  <UCard class="cursor-pointer shadow" @click="emit('edit', id)">
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-xl font-semibold text-info">{{ formatCurrency(amount) }}</span>
          <UBadge
            v-if="budgetName !== undefined"
            variant="subtle"
            :color="budgetColor ? undefined : (budgetName ? 'primary' : 'warning')"
            :style="budgetColor ? { backgroundColor: budgetColor + '22', color: budgetColor, borderColor: budgetColor + '55' } : {}"
            class="ml-auto"
          >
            {{ budgetName || 'No budget' }}
          </UBadge>
        </div>
        <span class="text-sm text-gray-500">{{ formatDate(date) }}</span>
        <span v-if="note" class="text-sm text-gray-600 dark:text-gray-300">{{ note }}</span>
        <div v-if="accountName" class="flex items-center gap-2">
          <div :class="['shrink-0 w-5 h-5 rounded-full flex items-center justify-center', institutionBgColor(accountInstitution, accountName)]">
            <img v-if="normalizedInstitution(accountInstitution, accountName).includes('bmo')" src="@/assets/images/BMO.png" alt="BMO" class="w-3 h-3" />
            <img v-else-if="normalizedInstitution(accountInstitution, accountName).includes('questrade')" src="@/assets/images/Questrade.png" alt="Questrade" class="w-3 h-3" />
            <img v-else-if="normalizedInstitution(accountInstitution, accountName).includes('scotiabank')" src="@/assets/images/Scotiabank.JPG" alt="Scotiabank" class="w-3 h-3" />
            <UIcon v-else :name="institutionIcon(accountInstitution, accountName)" class="w-3 h-3 text-primary-500" />
          </div>
          <span class="text-xs text-gray-400">{{ accountName }}</span>
        </div>
      </div>
      <UButton
        icon="heroicons-solid:trash"
        color="error"
        variant="ghost"
        size="sm"
        @click.stop="emit('delete', id)"
      />
    </div>
  </UCard>
</template>
