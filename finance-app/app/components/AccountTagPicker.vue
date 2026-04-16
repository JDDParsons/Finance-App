<script setup lang="ts">
import { useInstitutionBranding } from '~/composables/useInstitutionBranding'

interface AccountLike {
  id: string
  name?: string | null
  institution?: string | null
  is_credit_card?: boolean | null
}

const props = withDefaults(defineProps<{
  modelValue?: string | null
  accounts?: AccountLike[]
}>(), {
  modelValue: null,
  accounts: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const selectedAccount = computed(() =>
  props.accounts.find(account => account.id === props.modelValue) ?? null
)

const { institutionLogo, institutionIcon, institutionBgClass } = useInstitutionBranding()

function accountLogo(account: AccountLike | null) {
  return institutionLogo(account?.institution, account?.name)
}

function accountIcon(account: AccountLike | null) {
  if (account?.is_credit_card) return 'heroicons-solid:credit-card'
  return institutionIcon(account?.institution, account?.name)
}

function accountBgClass(account: AccountLike | null) {
  return institutionBgClass(account?.institution, account?.name)
}

function selectAccount(accountId: string) {
  emit('update:modelValue', accountId)
}
</script>

<template>
  <UPopover>
    <button
      type="button"
      class="inline-flex cursor-pointer items-center justify-center rounded-full border border-gray-200 px-2 py-1 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
      :aria-label="selectedAccount ? `Change account to ${selectedAccount.name || selectedAccount.institution || 'account'}` : 'Choose account'"
    >
      <div :class="['flex size-7 items-center justify-center rounded-full overflow-hidden', accountBgClass(selectedAccount)]">
        <img
          v-if="accountLogo(selectedAccount)"
          :src="accountLogo(selectedAccount)!.src"
          :alt="accountLogo(selectedAccount)!.alt"
          class="h-full w-full object-contain"
        />
        <UIcon v-else :name="accountIcon(selectedAccount)" class="size-4" />
      </div>
    </button>

    <template #content>
      <div class="min-w-48 p-2">
        <div class="flex flex-col gap-1">
          <button
            v-for="account in props.accounts"
            :key="account.id"
            type="button"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer"
            :class="account.id === props.modelValue
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="selectAccount(account.id)"
          >
            <div :class="['flex size-5 shrink-0 items-center justify-center rounded-full overflow-hidden', accountBgClass(account)]">
              <img
                v-if="accountLogo(account)"
                :src="accountLogo(account)!.src"
                :alt="accountLogo(account)!.alt"
                class="h-4 w-4 object-contain"
              />
              <UIcon v-else :name="accountIcon(account)" class="size-4 shrink-0" />
            </div>
            <span class="truncate">{{ account.name || account.institution || 'Account' }}</span>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
