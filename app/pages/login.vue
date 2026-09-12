<script setup lang="ts">
import type { AuthTokens, User } from '~/types'

definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const { setSession } = useAuth()
const router = useRouter()
const toast = useToast()
const { getToken } = useRecaptcha()

const form = reactive({ email: '', password: '' })
const loading = ref(false)

const showNewPasswordStep = ref(false)
const newPasswordSession = ref('')
const newPasswordForm = reactive({ newPassword: '', confirmPassword: '' })
const settingNewPassword = ref(false)

function applyAuthResult(data: { AccessToken: string, RefreshToken: string, ExpiresIn?: number, IdToken: string }) {
  const tokens: AuthTokens = {
    accessToken: data.AccessToken,
    refreshToken: data.RefreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (data.ExpiresIn ?? 3600),
  }

  const idPayload = JSON.parse(atob(data.IdToken.split('.')[1]))
  const userData: User = {
    id: idPayload.sub,
    email: idPayload.email,
    name: idPayload.email.split('@')[0],
    country_id: idPayload['custom:country_id'] ?? '',
    language_id: idPayload['custom:language_id'] ?? '',
    time_zone_id: idPayload['custom:timezone_id'] ?? '',
    createdAt: new Date().toISOString(),
  }

  setSession(tokens, userData)
  router.push('/')
}

async function handleLogin() {
  loading.value = true
  try {
    const recaptchaToken = await getToken('login')

    const response = await fetch(`${config.public.apiAuthBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, appId: config.public.apiAppId, recaptchaToken }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || 'Credenciales inválidas')
    }

    const data = await response.json()

    if (data.challenge === 'NEW_PASSWORD_REQUIRED') {
      newPasswordSession.value = data.session
      showNewPasswordStep.value = true
      return
    }

    applyAuthResult(data)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function handleSetNewPassword() {
  if (newPasswordForm.newPassword !== newPasswordForm.confirmPassword) {
    toast.add({ title: 'Error', description: 'Las contraseñas no coinciden', color: 'error' })
    return
  }

  settingNewPassword.value = true
  try {
    const response = await fetch(`${config.public.apiAuthBase}/auth/respond-new-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        newPassword: newPasswordForm.newPassword,
        session: newPasswordSession.value,
        appId: config.public.apiAppId,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || err.message || 'No se pudo establecer la nueva contraseña')
    }

    const data = await response.json()
    applyAuthResult(data)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    settingNewPassword.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gray-900">
          <UIcon name="i-heroicons-bolt" class="text-white text-3xl" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Zeus</h1>
        <p class="text-gray-500 mt-1">Administración de plataforma</p>
      </div>

      <UCard v-if="!showNewPasswordStep" class="shadow-xl">
        <template #header>
          <h2 class="text-lg font-semibold text-gray-800">Iniciar sesión</h2>
        </template>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <UFormField label="Email" name="email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="tu@email.com"
              icon="i-heroicons-envelope"
              required
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Contraseña" name="password">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              required
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UButton type="submit" block size="lg" color="neutral" :loading="loading" class="mt-2">
            Entrar
          </UButton>
        </form>
      </UCard>

      <UCard v-else class="shadow-xl">
        <template #header>
          <h2 class="text-lg font-semibold text-gray-800">Define tu contraseña</h2>
        </template>

        <p class="text-sm text-gray-500 mb-4">
          Es tu primer ingreso. Define una contraseña nueva para continuar.
        </p>

        <form class="space-y-4" @submit.prevent="handleSetNewPassword">
          <UFormField label="Nueva contraseña" name="newPassword">
            <UInput
              v-model="newPasswordForm.newPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              required
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirmar contraseña" name="confirmPassword">
            <UInput
              v-model="newPasswordForm.confirmPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              required
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UButton type="submit" block size="lg" color="neutral" :loading="settingNewPassword" class="mt-2">
            Continuar
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
