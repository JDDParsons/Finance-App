<script setup lang="ts">
useHead({ title: 'Settings | Budgify' })

const router = useRouter()

// Add a category here to add a row to the settings list.
const categories = [
  {
    to: '/settings/accounts',
    icon: 'heroicons-solid:building-library',
    title: 'Bank accounts',
    description: 'Add, remove, or edit your bank accounts',
  },
  {
    to: '/settings/entities',
    icon: 'heroicons-solid:building-storefront',
    title: 'Payment entities',
    description: 'Rename or merge your payment entities',
  },
  {
    to: '/settings/tags',
    icon: 'heroicons-solid:hashtag',
    title: 'Tags',
    description: 'Rename, recolor or delete your tags',
  },
]

function goBack() {
  if (import.meta.client && window.history.length > 1) router.back()
  else router.push('/profile')
}
</script>

<template>
  <div>
    <AppHeader title="Settings" />

    <UContainer class="py-6">
      <div class="mb-4 flex items-center justify-between">
        <UButton icon="heroicons-solid:arrow-left" color="neutral" variant="ghost" aria-label="Go back" @click="goBack" />
        <UColorModeSwitch />
      </div>

      <h1 class="mb-4 text-center text-2xl font-bold">Settings</h1>

      <ul class="mx-auto max-w-xl divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        <li v-for="category in categories" :key="category.to">
          <NuxtLink
            :to="category.to"
            class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <UIcon :name="category.icon" class="size-6 shrink-0 text-gray-500 dark:text-gray-400" />
            <span class="min-w-0 flex-1">
              <span class="block font-medium text-gray-900 dark:text-white">{{ category.title }}</span>
              <span class="block text-sm text-gray-500 dark:text-gray-400">{{ category.description }}</span>
            </span>
            <UIcon name="heroicons-solid:chevron-right" class="size-5 shrink-0 text-gray-400" />
          </NuxtLink>
        </li>
      </ul>
    </UContainer>
  </div>
</template>
