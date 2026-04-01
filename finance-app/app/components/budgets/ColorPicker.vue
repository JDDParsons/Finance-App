<script setup lang="ts">
const props = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const presets = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#64748b', // slate
    '#78716c', // stone
]

function select(color: string) {
    emit('update:modelValue', color)
}
</script>

<template>
    <div>
        <div class="flex flex-wrap gap-2">
            <button
                v-for="color in presets"
                :key="color"
                type="button"
                class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                :style="{ backgroundColor: color, borderColor: modelValue === color ? 'white' : 'transparent', boxShadow: modelValue === color ? `0 0 0 2px ${color}` : 'none' }"
                @click="select(color)"
            />
            <!-- Custom colour input -->
            <label class="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden relative" title="Custom colour">
                <UIcon name="heroicons-solid:plus" class="w-3 h-3 text-gray-400 pointer-events-none" />
                <input
                    type="color"
                    :value="modelValue"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    @input="(e) => select((e.target as HTMLInputElement).value)"
                />
            </label>
        </div>
        <!-- Preview swatch -->
        <div v-if="modelValue" class="mt-2 flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: modelValue }" />
            <span class="text-xs text-gray-400 font-mono">{{ modelValue }}</span>
        </div>
    </div>
</template>
