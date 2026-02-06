<script setup lang="ts">
import { getStatementGroups } from '../composables/supabase'

interface TimelineItem {
  value: number
  date: string
  title: string
  description: string
  icon: string
}

const items = ref<TimelineItem[]>([])
const defaultValue = ref<number>(0)
const isLoading = ref(true)

// Helper function to format month name and year
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Get the current date and calculate the past 4 months
function getPast4Months(): { year: number; month: number }[] {
  const months = []
  const today = new Date()

  for (let i = 3; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1, // JavaScript months are 0-indexed
    })
  }

  return months
}

// Build timeline items from statement groups
async function buildTimeline() {
  try {
    const groups = await getStatementGroups()
    const past4Months = getPast4Months()

    // Create a map of year-month to file names
    const monthMap: Record<string, { count: number; files: string[] }> = {}

    groups.forEach((group: any) => {
      if (group.year && group.month) {
        // group.month is already a string like "January", "February", etc.
        const key = `${group.year}-${group.month}`
        if (!monthMap[key]) {
          monthMap[key] = { count: 0, files: [] }
        }
        monthMap[key].count += group.transactions
        monthMap[key].files.push(group.name)
      }
    })

    console.log('Month map:', monthMap)
    console.log('Groups:', groups)

    // Build timeline items for past 4 months
    const monthNames: Record<number, string> = {
      1: 'January',
      2: 'February',
      3: 'March',
      4: 'April',
      5: 'May',
      6: 'June',
      7: 'July',
      8: 'August',
      9: 'September',
      10: 'October',
      11: 'November',
      12: 'December',
    }

    let numMonthsWithData = -1;

    const timelineItems: TimelineItem[] = past4Months.map((monthData, index) => {
      const monthName = monthNames[monthData.month]
      const key = `${monthData.year}-${monthName}`
      const dateString = `${monthName} ${monthData.year}`
      const monthInfo = monthMap[key]

      if (monthInfo) {
        const fileList = monthInfo.files.join('; ')
        numMonthsWithData++;
        return {
          value: index + 1,
          date: dateString,
          title: `${monthInfo.count} Transaction${monthInfo.count > 1 ? 's' : ''}`,
          description: fileList,
          icon: 'i-lucide-book-check',
        }
      } else {
        return {
          value: index + 1,
          date: dateString,
          title: 'No uploads yet',
          description: 'Upload not complete',
          icon: 'i-lucide-book-dashed',
        }
      }
    })

    items.value = timelineItems

    // Set default value to the last month (most recent)
    defaultValue.value = numMonthsWithData;
    console.log('Timeline items:', defaultValue.value )
  } catch (error) {
    console.error('Failed to load statement groups:', error)
  } finally {
    isLoading.value = false
  }
}

// Load data on component mount
onMounted(() => {
  buildTimeline()
})
</script>

<template>
  <div class="w-50% pt-20 pb-5 pl-70 bottom-10 fixed">
    <UTimeline
      v-if="!isLoading && items.length > 0"
      orientation="horizontal"
      :default-value="defaultValue"
      :items="items"
      @click="navigateTo('/statements')"
      class="cursor-pointer"
    />
    <div v-else-if="isLoading" class="flex items-center justify-center py-8">
      <p class="text-gray-500">Loading upload history...</p>
    </div>
  </div>
</template>
