<script setup>
import ViewReportTemplate from '~/components/viewReportTemplate.vue'
</script>

<template>
  <div>
    <UHeader title="Monthly Report - August 2025" />

    <UMain>
      <UContainer>
        <ViewReportTemplate :year="2025" :month="8" />
      </UContainer>
    </UMain>
  </div>
</template>
