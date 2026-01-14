<script setup lang="ts">
import { ref, computed } from 'vue'

interface Category {
  id: string
  name: string | null
}

const props = defineProps<{
  transactionId: string
  currentCategoryId: string | null
  categories: Category[]
}>()

const currentCategoryId = ref<string | undefined>(props.currentCategoryId || undefined);
const loading = ref(false)
const avatarUrl = ref('');

const selectedCategoryName = computed(() => {
  const selected = props.categories.find(c => c.id === currentCategoryId.value)
  return selected?.name || 'Select category'
})

async function submitCategoryChange() {
  if (!currentCategoryId.value) return
  
  loading.value = true
  try {
    const response = await fetch('/api/transaction-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: props.transactionId,
        categoryId: currentCategoryId.value
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.statusMessage || 'Failed to update category')
      avatarUrl.value = 'https://www.driversupport.com/wp-content/uploads/2019/04/red-x-on-network-icon.png'
    }
    else {
      // Successfully updated
      console.log('Category updated successfully')
      avatarUrl.value = 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Eo_circle_green_white_checkmark.svg'
    }
  } catch (error: any) {
    console.error('Error updating category:', error.message)
    // Reset to previous value on error
    currentCategoryId.value = props.currentCategoryId || undefined
    avatarUrl.value = 'https://www.driversupport.com/wp-content/uploads/2019/04/red-x-on-network-icon.png'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <USelectMenu
    v-model="currentCategoryId"
    value-key="id"
    color="warning" 
    :highlight="!currentCategoryId"
    size="sm"
    :items="categories"
    placeholder="Select a category"
    option-attribute="name"
    value-attribute="id"
    class="w-50"
    :popper="{ placement: 'bottom-start' }"
    :loading="loading"
    loading-icon="i-lucide-loader"
    :avatar="{
      src: avatarUrl
    }"
    @change="submitCategoryChange()"
  >
  </USelectMenu>
</template>

