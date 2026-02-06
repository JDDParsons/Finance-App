<script setup>
import { useSupabaseBrowser } from '../utils/supabaseBrowser'

const email = ref('');
const supabaseBrowser = useSupabaseBrowser();

async function sendMagicLink() {
    if (!email.value) {
        alert('Please enter a valid email address.');
        return;
    }

      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: email.value,
        options: {
        emailRedirectTo: window.location.origin
        }
    })

    if (error) {
        alert('Error sending magic link: ' + error.message);
    } else {
        alert('Magic link sent! Please check your email.');
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
                <div class="grid grid-cols-4 gap-4">
                    <NuxtLink to="/upload">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            
                            <h2 class="text-lg font-semibold text-center">Upload</h2>
                            <p class="text-sm text-center"> Upload a bank statement</p>
                        </UCard>
                    </NuxtLink>
<!--
                    <NuxtLink to="/snap">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            
                            <h2 class="text-lg font-semibold text-center">Snap your balances</h2>
                            <p class="text-sm text-gray-400 text-center"> Record a snapshot of all current account balances </p>
                        </UCard>
                    </NuxtLink>
-->
                    <NuxtLink to="/reports">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            <h2 class="text-lg font-semibold text-center">View</h2>
                            <p class="text-sm text-center"> Browse data and reports </p>
                        </UCard>
                    </NuxtLink>
                </div>
                <UFormField label="Email address" description="" class="text-lg font-semibold mb-4" required>
                    <UInput type="email" variant="soft" size="xl" color="neutral" placeholder="Enter an email..." v-model="email" />
                    <UButton class="mt-4" variant="soft" color="secondary" @click="sendMagicLink">Send Magic Link</UButton>
                </UFormField>
            </UContainer>
        </UMain>
    </div>
</template>