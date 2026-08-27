<script setup lang="ts">
defineProps<{
  message: string
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <UAlert
          title="Warning"
          :description="message"
          icon="heroicons:exclamation-triangle"
          color="warning"
          variant="soft"
        />

        <div class="mt-6 flex justify-end">
          <UButton color="warning" @click="open = false">
            OK
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
