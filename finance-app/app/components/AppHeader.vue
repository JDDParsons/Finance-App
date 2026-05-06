<script setup lang="ts">
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'

const props = withDefaults(defineProps<{
  title?: string
  showMonth?: boolean
  showProfile?: boolean
}>(), {
  showMonth: true,
  showProfile: true,
})

const { monthTitle } = useSelectedMonthTitle()
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <div class="flex items-center gap-2.5">
        <img src="/Budgify.png" alt="" class="h-14 w-14 rounded-lg shrink-0" />
        <div>
          <p
            v-if="showMonth"
            class="text-4xl text-neutral font-extrabold leading-none tracking-tight sm:text-4xl"
          >
            {{ monthTitle }}
          </p>
        </div>
      </div>
    </template>
    <template #right>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <MonthSelector v-if="showMonth" plain />
        <UButton
          v-if="showProfile"
          to="/accounts"
          color="neutral"
          variant="ghost"
          size="xl"
          icon="heroicons-solid:user-circle"
          aria-label="Open profile"
        />
      </div>
    </template>
  </UHeader>
</template>
