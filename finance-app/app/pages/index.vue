<script setup>
import { sendMagicLink, getSession } from '../composables/supabase'

const email = ref('');
const loading = ref(false);

async function handleSendMagicLink() {
    loading.value = true;
    try {
        const result = await sendMagicLink(email.value);
        alert(result.message);
        if (result.success) {
            email.value = '';
        }
    } finally {
        loading.value = false;
    }
}

</script>
<template>
    <div>
        <UHeader title="Personal Finance App">
          <template #right>
            <UColorModeSwitch />
          </template>
        </UHeader>
        <UMain>
            <UContainer>
                <div class="flex flex-col items-center justify-center min-h-screen space-y-8">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold mb-4">Welcome to Personal Finance App</h1>
                        <p class="text-lg text-gray-400">Sign in with your email to get started</p>
                    </div>

                    <UCard class="w-full max-w-md p-8">
                        <UFormField description="" class="text-lg font-semibold mb-4" required>
                            <UInput 
                                type="email" 
                                variant="soft" 
                                size="xl" 
                                class="w-full"
                                color="neutral" 
                                placeholder="Enter your email..." 
                                v-model="email"
                                :disabled="loading"
                            />
                            <UButton 
                                class="mt-4 w-full" 
                                color="primary" 
                                @click="handleSendMagicLink"
                                :loading="loading"
                            >
                                Send Magic Link
                            </UButton>
                        </UFormField>
                    </UCard>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>