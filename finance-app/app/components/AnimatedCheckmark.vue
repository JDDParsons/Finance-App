<script setup>
const playSuccessSound = () => {
  const audio = new Audio('/success.mp3');
  audio.volume = 0.4; // Keep it subtle
  audio.play().catch(e => {
    // Browsers block auto-play until the user clicks something
    console.log("Audio requires user interaction first");
  });
};

onMounted(() => {
  // Delay the sound slightly to match the checkmark appearance (0.8s)
  setTimeout(playSuccessSound, 225);
});
</script>
<template>
  <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
    <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
    <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
  </svg>
</template>

<style scoped>
.checkmark {
  width: var(--checkmark-size, 56px);
  height: var(--checkmark-size, 56px);
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: #4bb71b; /* Your green */
  stroke-miterlimit: 10;
  animation: scale .3s ease-in-out .9s both;
}

.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: #4bb71b;
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards, fill-circle 0.4s ease-in-out 0.4s forwards;
}

.checkmark__check {
  transform-origin: 50% 50%;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}

@keyframes stroke { 100% { stroke-dashoffset: 0; } }
@keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
@keyframes fill-circle { 100% { fill: #4bb71b; } }
</style>
