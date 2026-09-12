<script setup lang="ts">
definePageMeta({ middleware: ['auth'], layout: 'default' })

const { user, clearSession } = useAuth()
const router = useRouter()

function logout() {
  clearSession()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center max-w-md">
      <UIcon name="i-heroicons-lock-closed" class="text-4xl text-gray-300 mb-4" />
      <h1 class="text-xl font-semibold text-gray-900 mb-2">Sin acceso a Zeus</h1>
      <p class="text-gray-500 mb-6">
        {{ user?.email }} no tiene permisos de administrador de plataforma sobre ninguna
        aplicación todavía. Pedile a quien ya tenga acceso que te agregue.
      </p>
      <UButton color="neutral" variant="outline" @click="logout">Cerrar sesión</UButton>
    </div>
  </div>
</template>
