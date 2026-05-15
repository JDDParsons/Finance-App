<script setup lang="ts">
const { visible } = useSuccessOverlay()
</script>

<template>
  <Teleport to="body">
    <Transition name="success-overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex items-center justify-center"
        style="background: rgba(0,0,0,0); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);"
      >
        <BudgetsAnimatedCheckmark style="--checkmark-size: 16rem;" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.success-overlay-enter-active {
  transition: opacity 0.2s ease;
}
.success-overlay-leave-active {
  transition: opacity 0.35s ease;
}
.success-overlay-enter-from,
.success-overlay-leave-to {
  opacity: 0;
}
</style>
