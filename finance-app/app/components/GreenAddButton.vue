<template>
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <button
            class="fab flex items-center justify-center w-11 h-11 rounded-full bg-primary-500 hover:bg-primary-600 transition-transform shadow-lg shadow-black/40"
            :class="{ 'fab--pressing': isPressing }"
            @click="$emit('click')"
            @mousedown="isPressing = true"
            @mouseup="isPressing = false"
            @mouseleave="isPressing = false"
            @touchstart.passive="isPressing = true"
            @touchend="isPressing = false"
            aria-label="Add"
        >
            <UIcon name="fa-solid:plus" class="text-white size-5" />
        </button>
    </div>
</template>

<script setup lang="ts">
const isPressing = ref(false)
defineEmits(['click'])
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
