<script setup>

</script>
<template>
    <div>
        <UHeader title="Personal Finance App" />

        <UMain>
            <UContainer>
                <div class="grid grid-cols-4 gap-4">
                    <NuxtLink to="/viewMonthlyReport">
                        <UCard class="mt-8 p-4 h-48 flex flex-col items-center justify-center cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95">
                            <h2 class="text-lg font-semibold">August</h2>
                        </UCard>
                    </NuxtLink>

                    <UCard class="mt-8 p-4 h-48 flex flex-col items-center justify-center">
                        <h2 class="text-lg font-semibold">September</h2>
                    </UCard>

                    <UCard class="mt-8 p-4 h-48 flex flex-col items-center justify-center">
                        <h2 class="text-lg font-semibold">October</h2>
                    </UCard>

                    <UCard class="mt-8 p-4 h-48 flex flex-col items-center justify-center">
                        <h2 class="text-lg font-semibold">November</h2>
                    </UCard>

                    <UCard class="mt-8 p-4 h-48 flex flex-col items-center justify-center">
                        <h2 class="text-lg font-semibold">December</h2>
                    </UCard>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>
