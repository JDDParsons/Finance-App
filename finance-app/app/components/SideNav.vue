<template>
  <nav class="fixed top-0 left-0 bottom-0 w-56 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 flex flex-col z-50">
    <div class="px-6 py-6 mb-2">
      <span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Finance App</span>
    </div>
    <div class="flex flex-col flex-1 gap-1 px-3">
      <NuxtLink
        v-for="item in navigation"
        :key="item.label"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        active-class="bg-primary-50 dark:bg-primary-900/30 text-primary-500 dark:text-primary-400 font-medium"
      >
        <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
        <span class="text-sm">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const navigation = [
  { label: 'Home', icon: 'fa-solid-home', to: '/home' },
  { label: 'Budgets', icon: 'pepicons-pop:dollar-circle-filled', to: '/budgets' },
  { label: 'Cashflow', icon: 'heroicons-solid:arrows-right-left', to: '/cashflow' },
  { label: 'Savings', icon: 'streamline-flex:decent-work-and-economic-growth-solid', to: '/savings' },
  { label: 'Profile', icon: 'heroicons-solid:user-circle', to: '/accounts' },
  { label: 'Upload', icon: 'heroicons-solid:arrow-up-tray', to: '/upload' },
]
</script>
