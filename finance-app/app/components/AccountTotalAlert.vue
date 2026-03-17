<script setup lang="ts">
const props = defineProps<{
  accounts: any[]
}>()

const totalValue = computed(() => {
  return (props.accounts || []).reduce((sum: number, account: any) => {
    const amount = Number(account?.cumulative_amount)
    if (!Number.isFinite(amount)) return sum
    return account?.is_credit_card ? sum - amount : sum + amount
  }, 0)
})

const formattedTotal = computed(() =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(totalValue.value)
)
</script>

<template>
  <UAlert
    color="primary"
    variant="soft"
    icon="heroicons-solid:calculator"
    title="Total Account Value"
    :description="formattedTotal"
  />
</template>
