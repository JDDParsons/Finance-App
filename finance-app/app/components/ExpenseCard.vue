<script setup lang="ts">
import { useInstitutionBranding } from '~/composables/useInstitutionBranding'

const { normalizedInstitution, institutionLogo, institutionIcon, institutionBgClass } = useInstitutionBranding()

const props = defineProps<{
  id: string
  amount: number | null
  date: string | null
  note?: string | null
  budgetName?: string | null
  budgetColor?: string | null
  budgetIcon?: string | null
  accountName?: string | null
  accountInstitution?: string | null
  userFirstName?: string | null
  userAvatarLink?: string | null
}>()

const emit = defineEmits<{
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

const borderColor = computed(() => props.budgetColor || '#E5E7EB')
</script>

<template>
  <UCard
    class="cursor-pointer shadow"
    :style="{ borderLeft: `4px solid ${borderColor}` }"
    @click="emit('edit', id)"
  >
    <div class="flex flex-col gap-1.5">
      <!-- Top row: amount | date | budget icon -->
      <div class="flex items-center gap-2">
        <span class="text-xl font-semibold text-info">{{ formatCurrency(amount) }}</span>
        <span class="text-sm text-gray-400 flex-1">{{ formatDate(date) }}</span>
        <!-- Budget icon: colored circle or grey X pattern for uncategorized -->
        <template v-if="budgetName !== undefined">
          <div
            v-if="budgetColor && budgetIcon"
            class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            :style="{ backgroundColor: budgetColor + '33' }"
          >
            <UIcon :name="budgetIcon" class="w-4 h-4" :style="{ color: budgetColor }" />
          </div>
          <div
            v-else
            class="w-7 h-7 rounded-full shrink-0"
            style="background-color: #F3F4F6; background-image: repeating-linear-gradient(45deg, #D1D5DB 0, #D1D5DB 0.6px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #D1D5DB 0, #D1D5DB 0.6px, transparent 0, transparent 50%); background-size: 8px 8px;"
          />
        </template>
      </div>

      <!-- Note -->
      <span v-if="note" class="text-sm text-gray-600 dark:text-gray-300">{{ note }}</span>

      <!-- Bottom row: account + user info -->
      <div v-if="accountName !== null && accountName !== undefined || userFirstName" class="flex items-center gap-2 flex-wrap">
        <!-- Account -->
        <div v-if="accountName" class="flex items-center gap-1.5">
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
        </div>

        <!-- User info -->
        <div v-if="userFirstName" class="flex items-center gap-1.5 ml-auto">
          <img
            v-if="userAvatarLink"
            :src="userAvatarLink"
            :alt="userFirstName"
            class="w-4 h-4 rounded-full object-cover shrink-0"
          />
          <div
            v-else
            class="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0"
          >
            <span class="text-[8px] font-bold text-primary-600 dark:text-primary-300 leading-none select-none">
              {{ userFirstName.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="text-xs text-gray-400">{{ userFirstName }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
