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
  <div class="absolute pointer-events-none" style="bottom: 22px; left: 50%; width: 0; height: 0; z-index: 10;">
    <!-- Needle rotating around the pivot -->
    <div :style="`
      position: absolute;
      bottom: 0;
      left: -10px;
      width: 20px;
      height: 110px;
      transform-origin: bottom center;
      transform: rotate(${displayedAngle}deg);
      transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    `">
      <svg width="20" height="106" viewBox="0 0 20 106" fill="none" style="position: absolute; bottom: 0; left: 0;">
        <!-- Angular kite body: sharp tip, widens toward base fin -->
        <polygon points="10,2 11.5,68 14,94 11,116 9,116 6,94 8.5,68" fill="#22c55e" />
        <!-- Darker angular fin at base -->
        <polygon points="14,94 11,116 9,116 6,94 10,90" fill="#16a34a" />
        <!-- White centre highlight for depth -->
        <polygon points="10,2 10.7,74 9.3,74" fill="white" opacity="0.55" />
      </svg>
    </div>
    <!-- Pivot hub -->
    <div style="
      position: absolute;
      bottom: -7px;
      left: -7px;
      width: 14px;
      height: 14px;
      background: white;
      border: 2.5px solid #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(34,197,94,0.4);
    "></div>
  </div>
</template>
