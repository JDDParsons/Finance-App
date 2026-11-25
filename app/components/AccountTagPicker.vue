<script setup lang="ts">
import { useInstitutionBranding } from '~/composables/useInstitutionBranding'
import { accountDisplayName, resolveAccountIcon } from '../../utils/accountAppearance'

interface AccountLike {
  id: string
  name?: string | null
  institution?: string | null
  is_credit_card?: boolean | null
  color?: string | null
  icon?: string | null
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
const open = ref(false)

const selectedAccount = computed(() =>
  props.accounts.find(account => account.id === props.modelValue) ?? null
)

const { institutionBgClass } = useInstitutionBranding()

function accountBgClass(account: AccountLike | null) {
  return institutionBgClass(account?.institution, account?.name)
}

function selectAccount(accountId: string) {
  emit('update:modelValue', accountId)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <TagPill
      :icon="resolveAccountIcon(selectedAccount?.icon)"
      :label="selectedAccount ? accountDisplayName(selectedAccount) : 'No account'"
      :filled="!!selectedAccount"
      :aria-label="selectedAccount ? `Change account to ${accountDisplayName(selectedAccount)}` : 'Choose account'"
    />

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
            <AccountVisual :account="account" :fallback-class="accountBgClass(account)" size="sm" />
            <span class="truncate">{{ accountDisplayName(account) }}</span>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
