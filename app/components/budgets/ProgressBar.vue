<script setup lang="ts">
const props = defineProps<{
    value: number
    max: number
}>()

const percentage = computed(() => {
    if (props.max <= 0) return 0
    return Math.min(Math.max((props.value / props.max) * 100, 0), 100)
})

const fillStyle = computed(() => ({
    width: `${percentage.value}%`,
    backgroundImage: 'linear-gradient(to right, #22c55e, #eab308)',
    backgroundSize: percentage.value > 0 ? `${10000 / percentage.value}% 100%` : '100% 100%',
    boxShadow: '0 0 3px 0.3px rgb(34 197 94 / 45%)'
}))
</script>

<template>
    <div class="mt-1 w-full h-2 rounded-full overflow-visible bg-white dark:bg-gray-700">
        <div
            v-if="percentage > 0"
            class="h-full rounded-full transition-all duration-500"
            :style="fillStyle"
        />
    </div>
</template>
