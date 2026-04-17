<template>
  <nav class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 pb-safe">
    <div class="flex justify-around items-center h-16">
      <!-- Left two nav items -->
      <NuxtLink
        v-for="item in leftNav"
        :key="item.label"
        :to="item.to"
        class="flex flex-col items-center gap-1 text-gray-500 flex-1"
        active-class="text-primary-500"
      >
        <UIcon :name="item.icon" class="w-6 h-6" />
        <span class="text-xs">{{ item.label }}</span>
      </NuxtLink>

      <!-- Center FAB -->
      <div class="flex-1 flex justify-center">
        <button
          class="fab flex items-center justify-center w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 transition-transform shadow-lg shadow-black/40 -mt-6"
          :class="{ 'fab--pressing': isPressing }"
          @click="openModal"
          @mousedown="isPressing = true"
          @mouseup="isPressing = false"
          @mouseleave="isPressing = false"
          @touchstart.passive="isPressing = true"
          @touchend="isPressing = false"
          aria-label="Add expense"
        >
          <UIcon name="fa-solid:plus" class="text-white size-6" />
        </button>
      </div>

      <!-- Right two nav items -->
      <NuxtLink
        v-for="item in rightNav"
        :key="item.label"
        :to="item.to"
        class="flex flex-col items-center gap-1 text-gray-500 flex-1"
        active-class="text-primary-500"
      >
        <UIcon :name="item.icon" class="w-6 h-6" />
        <span class="text-xs">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>

  <!-- Add Expense Modal -->
  <UModal v-if="isModalOpen" v-model:open="isModalOpen">
    <template #content>
      <div class="bg-white dark:bg-gray-950">
        <BudgetsExpenseCreate
          :budgets="store.budgets"
          @update="handleExpenseCreated"
          @cancel="isModalOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const leftNav = [
  { label: 'Home', icon: 'fa-solid-home', to: '/home' },
  { label: 'Budgets', icon: 'pepicons-pop:dollar-circle-filled', to: '/budgets' },
]

const rightNav = [
  { label: 'Cashflow', icon: 'heroicons-solid:arrows-right-left', to: '/cashflow' },
  { label: 'Profile', icon: 'heroicons-solid:user-circle', to: '/accounts' },
]

const isPressing = ref(false)
const isModalOpen = ref(false)

function openModal() {
  isModalOpen.value = true
}

function handleExpenseCreated() {
  isModalOpen.value = false
  store.fetchAll()
}
</script>

<style scoped>
.fab {
  will-change: transform, box-shadow;
}

.fab--pressing {
  transform: scale(0.92);
  animation: pulse-ring 0.7s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55), 0 10px 25px rgba(0, 0, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(34, 197, 94, 0), 0 10px 25px rgba(0, 0, 0, 0.4);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0), 0 10px 25px rgba(0, 0, 0, 0.4);
  }
}
</style>
