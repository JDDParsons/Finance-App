<script setup>

const toast = useToast();
const fileInput = ref(null);
const fileUploaded = ref(false);

function resetForm() {
    fileInput.value = null;
    fileUploaded.value = false;
}

async function upload() {
    if (fileInput.value) {
        const formData = new FormData()
        formData.append('file', fileInput.value)   // VERY IMPORTANT

        const response = await $fetch('/api/upload', {
            method: 'POST',
            body: formData
            // DON'T set headers — FormData sets them automatically
        })

        fileUploaded.value = true;

        toast.add({
            title: 'Bank statement uploaded successfully',
            description: 'Your transactions are being processed.'
        })

    } else {
        alert("Please upload a CSV file before submitting.");
    }
};

</script>
<template>
    <div>
        <UHeader title="Personal Finance App" />

        <UMain>
            <UContainer>
                <div v-if="fileUploaded" class="flex flex-col items-center justify-center p-8 mb-12 space-y-4">
                    <h1 class="text-xl font-bold">File uploaded successfully!</h1>
                    <p>Your bank statement has been uploaded and is being processed.</p>
                    <div class="flex space-x-4 mt-8">
                        <UButton to="/" color="neutral" variant="outline" size="xl">Go to Home</UButton>
                        <UButton to="/upload" color="primary" variant="outline" size="xl" @click="resetForm()">Upload Another File</UButton>
                    </div>
                </div>
                <div v-else class="divider mb-8">
                    <div class="flex flex-col items-center justify-center p-8 mb-12 space-y-4">                     
                        <h1 class="text-xl font-bold">Upload a bank statement</h1>
                        <p>Please upload a CSV file containing transaction records from your bank.</p>
                    </div>
                    <div class="flex flex-col items-center justify-center space-y-8">
                        <UFileUpload v-model="fileInput" accept="text/csv" label="Drop your file here" description="Single CSV only" class="w-96 min-h-48" />
                        <div class="flex space-x-4">
                            <UButton to="/statements" color="neutral" variant="outline" size="xl">View uploaded statements</UButton>
                            <UButton active color="primary" variant="outline" active-color="primary" active-variant="outline" size="xl" @click="upload()">Submit</UButton>
                        </div>
                    </div>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>