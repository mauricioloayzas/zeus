<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'origin'] })

const { origins, isOwner } = useZeusContext()
const router = useRouter()

onMounted(() => {
  if (origins.value.length) {
    router.replace(`/${origins.value[0].profile.url_name}/${isOwner.value ? 'aplicaciones' : 'suscripciones'}`)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
  </div>
</template>
