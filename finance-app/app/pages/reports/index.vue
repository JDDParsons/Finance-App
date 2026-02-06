<script setup>

</script>
<template>
<div class="min-h-screen flex flex-col">
  <UHeader title="Personal Finance App">
    <template #right>
      <UColorModeSwitch />
    </template>
  </UHeader>
  <UMain class="flex-1 flex items-center justify-center">
    <UContainer>
      <div class="flex items-center justify-center gap-8">
        <!-- Left -->
        <NuxtLink to="/reports/monthly" class="w-1/2 flex items-center justify-center p-8 pr-10">
          <div class="cursor-pointer transition transform hover:scale-105 active:scale-95 w-full flex flex-col items-center justify-center gap-4">
            <UIcon name="radix-icons:calendar" class="w-24 h-24" />
            <h2 class="text-4xl font-semibold text-center">Monthly Reports</h2>
          </div>
        </NuxtLink>

        <!-- Divider -->
        <div class="w-px h-150 bg-gray-100 dark:bg-gray-200 shadow-lg shadow-black/10"></div>

        <!-- Right -->
        <NuxtLink to="/monthlyReports" class="w-1/2 flex items-center justify-center p-8 pr-10">
          <div class="cursor-pointer transition transform hover:scale-105 active:scale-95 w-full flex flex-col items-center justify-center gap-4">
            <UIcon name="fa-solid:chart-line" class="w-24 h-24" />
            <h2 class="text-4xl font-semibold text-center">Trailing Reports</h2>
          </div>
        </NuxtLink>
      </div>
    </UContainer>
  </UMain>
</div>
</template>
