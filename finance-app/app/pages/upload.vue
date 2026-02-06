<script setup>

import { uploadFile } from '../composables/supabase'

const toast = useToast();
const fileInput = ref(null);
const fileUploaded = ref(false);

function resetForm() {
    fileInput.value = null;
    fileUploaded.value = false;
}

async function upload() {
    if (fileInput.value) {
        try {
            await uploadFile(fileInput.value)
            fileUploaded.value = true;

            toast.add({
                title: 'Bank statement uploaded successfully',
                description: 'Your transactions are being processed.'
            })
        } catch (err) {
            console.error(err)
            alert('Failed to upload file. See console for details.')
        }

    } else {
        alert("Please upload a CSV file before submitting.");
    }
};

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
                <div v-if="fileUploaded" class="flex flex-col items-center justify-center p-8 mb-12 space-y-4">
                    <h1 class="text-xl font-bold">File uploaded successfully!</h1>
                    <p>Your bank statement has been uploaded and is being processed.</p>
                    <div class="flex space-x-4 mt-8">
                        <UButton to="/" color="neutral" variant="outline" size="xl">Go to Home</UButton>
                        <UButton to="/upload" color="primary" variant="outline" size="xl" @click="resetForm()">Upload Another File</UButton>
                    </div>
                    <UButton to="/transactions" color="secondary" variant="outline" size="xl">View transaction data</UButton>
                </div>
                <div v-else class="divider mb-8">
                    <div class="flex flex-col items-center justify-center p-8 mb-12 space-y-4">                     
                        <h1 class="text-xl font-bold">Upload a bank statement</h1>
                        <p>Please upload a CSV file containing transaction records from your bank.</p>
                    </div>
                    <div class="flex flex-col items-center justify-center space-y-8">
                        <UFileUpload v-model="fileInput" accept="text/csv" label="Drop your file here" description="Single CSV only" class="w-96 min-h-48" />
                        <div class="flex flex-col items-center justify-center pt-5">
                            <UButton to="/upload" color="primary" active-color="primary" size="xl" @click="upload()">Submit bank statement</UButton>
                            <div class="flex space-x-4 pt-7">
                                <UButton to="/menu" color="neutral" variant="outline" size="xl">Back</UButton>
                                
                                <UButton to="/reports/monthly" color="secondary" variant="outline" size="xl">View reports</UButton>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-center justify-center">
                    <UploadTimeline />
                </div>
            </UContainer>
        </UMain>
    </div>
</template>