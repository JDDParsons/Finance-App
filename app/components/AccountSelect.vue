<script setup lang="ts">
import { accountDisplayName } from '../../utils/accountAppearance'
const props = withDefaults(defineProps<{
  accounts: any[]
  placeholder?: string
  color?: string
}>(), { placeholder: 'Choose account', color: 'primary' })

const model = defineModel<string | undefined>()
const items = computed(() => props.accounts.map(account => ({
  label: accountDisplayName(account),
  value: account.id,
  account,
})))
const selected = computed(() => props.accounts.find(account => account.id === model.value) ?? null)
</script>

<template>
  <USelect v-model="model" :items="items" :placeholder="placeholder" size="xl" :color="color as any" class="w-full">
    <template #leading>
      <AccountVisual v-if="selected" :account="selected" size="sm" />
    </template>
    <template #item-leading="{ item }">
      <AccountVisual :account="item.account" size="sm" />
    </template>
  </USelect>
</template>
