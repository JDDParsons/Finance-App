<script setup>
const props = defineProps({
  angle: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    default: '#ef4444',
  },
})

const displayedAngle = ref(-90)

watch(() => props.angle, (newAngle) => {
  displayedAngle.value = -90
  nextTick(() => {
    requestAnimationFrame(() => {
      displayedAngle.value = newAngle
    })
  })
}, { immediate: true })
</script>

<template>
  <!-- Zero-size pivot anchored at bottom-center of parent -->
  <div class="absolute pointer-events-none" style="bottom: 14px; left: 50%; width: 0; height: 0; z-index: 10;">
    <!-- Needle bar rotating around the pivot -->
    <div :style="`
      position: absolute;
      bottom: 0;
      left: -2px;
      width: 4px;
      height: 130px;
      background: ${color};
      border-radius: 3px 3px 0 0;
      opacity: 0.95;
      transform-origin: bottom center;
      transform: rotate(${displayedAngle}deg);
      transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    `"></div>
    <!-- Pivot dot -->
    <div :style="`
      position: absolute;
      bottom: -6px;
      left: -6px;
      width: 12px;
      height: 12px;
      background: ${color};
      border-radius: 50%;
      opacity: 1;
    `"></div>
  </div>
</template>
