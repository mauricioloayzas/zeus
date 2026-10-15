<script setup lang="ts">
import type { TelegramAccount } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

// Solo para el perfil origin — mismo criterio que whatsapp/index.vue: cualquier otro perfil
// de Clichín/Hayayaku ya conecta y configura su propio Telegram desde su propio frontend.
const { activeOrigin } = useZeusContext()
const { getAccount, connect, disconnect } = useTelegram()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const account = ref<TelegramAccount | null>(null)
const loading = ref(true)
const connecting = ref(false)
const disconnecting = ref(false)
const botToken = ref('')

async function load() {
  if (!profileId.value) return
  loading.value = true
  try {
    account.value = await getAccount(profileId.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(profileId, load)

async function handleConnect() {
  if (!profileId.value || !botToken.value.trim()) return
  connecting.value = true
  try {
    await connect(profileId.value, { bot_token: botToken.value.trim() })
    botToken.value = ''
    toast.add({ title: 'Telegram conectado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect() {
  if (!profileId.value) return
  disconnecting.value = true
  try {
    await disconnect(profileId.value)
    account.value = null
    toast.add({ title: 'Telegram desconectado', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    disconnecting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <h1 class="text-xl font-semibold text-gray-900 mb-6">Telegram</h1>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <UCard class="shadow mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="account ? 'bg-sky-100' : 'bg-gray-100'"
          >
            <UIcon
              :name="account ? 'i-simple-icons-telegram' : 'i-heroicons-shield-exclamation'"
              :class="account ? 'text-sky-600' : 'text-gray-400'"
            />
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-900">
              {{ account ? `Conectado: @${account.bot_username}` : 'No tienes Telegram conectado' }}
            </p>
            <p class="text-sm text-gray-500">
              {{ account ? 'Los avisos de trial/pago a los negocios también salen por este bot' : 'Conecta un bot de Telegram como alternativa a WhatsApp' }}
            </p>
          </div>
          <UButton v-if="account" variant="outline" color="error" :loading="disconnecting" @click="handleDisconnect">
            Desconectar
          </UButton>
        </div>

        <div v-if="!account" class="mt-4 space-y-3">
          <div class="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 space-y-1">
            <p class="font-medium text-gray-700">Cómo crear el bot (2 minutos):</p>
            <ol class="list-decimal list-inside space-y-1">
              <li>Abre Telegram y busca <strong>@BotFather</strong>.</li>
              <li>Mándale <code>/newbot</code> y sigue las instrucciones.</li>
              <li>Copia el token que te da y pégalo abajo.</li>
            </ol>
          </div>
          <UFormField label="Token del bot">
            <UInput v-model="botToken" placeholder="123456789:ABC-DEF..." class="w-full" />
          </UFormField>
          <UButton color="neutral" :loading="connecting" :disabled="!botToken.trim()" @click="handleConnect">
            Conectar Telegram
          </UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>
