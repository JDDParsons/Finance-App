<script setup lang="ts">
const props = defineProps<{
    value: number
    max: number
    colour: string
}>()

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))
</script>

<template>
    <div class="mt-1 w-full h-2 rounded-full overflow-visible bg-white dark:bg-gray-700">
        <div
            v-if="percentage > 0"
            class="h-full rounded-full transition-all duration-500"
            :style="{
                width: `${percentage}%`,
                backgroundColor: props.colour,
                boxShadow: `0 0px 3px 0.3px ${props.colour}`
            }"
        />
    </div>
</template>
