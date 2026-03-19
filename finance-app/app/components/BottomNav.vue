<template>
  <nav class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 pb-safe">
    <div class="flex justify-around items-center h-16">
      <NuxtLink 
        v-for="item in navigation" 
        :key="item.label"
        :to="item.to"
        class="flex flex-col items-center gap-1 text-gray-500"
        active-class="text-primary-500"
      >
        <UIcon :name="item.icon" class="w-6 h-6" />
        <span class="text-xs">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const navigation = [
  { label: 'Home', icon: 'fa-solid-home', to: '/' },
  { label: 'Budgets', icon: 'tabler:mail-filled', to: '/budgets' },
  { label: 'Cashflow', icon: 'heroicons-solid:arrows-right-left', to: '/cashflow' },
  { label: 'Savings', icon: 'fa-solid-dollar-sign', to: '/savings' },
  { label: 'Accounts', icon: 'heroicons-solid:credit-card', to: '/accounts' }
  ]
</script>
