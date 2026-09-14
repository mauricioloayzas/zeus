<script setup lang="ts">
import type { WhatsAppAccount, WhatsAppTemplate, WhatsAppTemplateForm } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

// Solo para el perfil origin: cualquier otro perfil de Clichín/Hayayaku ya puede conectar y
// configurar su propio WhatsApp desde su propio frontend — no hace falta duplicarlo acá.
const { activeOrigin } = useZeusContext()
const { getAccount, connect, disconnect, listTemplates, createTemplate, deleteTemplate, testTemplate } = useWhatsApp()
const { launch } = useMetaEmbeddedSignup()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const account = ref<WhatsAppAccount | null>(null)
const templates = ref<WhatsAppTemplate[]>([])
const loading = ref(true)
const connecting = ref(false)
const disconnecting = ref(false)

async function load() {
  if (!profileId.value) return
  loading.value = true
  try {
    const [acc, tpls] = await Promise.all([
      getAccount(profileId.value),
      listTemplates(profileId.value),
    ])
    account.value = acc
    templates.value = tpls
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(profileId, load)

async function handleConnect() {
  if (!profileId.value) return
  connecting.value = true
  try {
    const result = await launch()
    await connect(profileId.value, {
      code: result.code,
      waba_id: result.wabaId,
      phone_number_id: result.phoneNumberId,
      business_id: result.businessId,
      is_coexistence: result.isCoexistence,
    })
    toast.add({
      title: 'WhatsApp conectado',
      description: result.isCoexistence ? 'Compartido con la app de WhatsApp Business — sigue funcionando en el celular en paralelo.' : undefined,
      color: 'success',
    })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect() {
  if (!profileId.value) return
  if (!confirm('¿Desconectar el número de WhatsApp de origin?')) return
  disconnecting.value = true
  try {
    await disconnect(profileId.value)
    toast.add({ title: 'Número desconectado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    disconnecting.value = false
  }
}

const showModal = ref(false)
const saving = ref(false)
const form = reactive<WhatsAppTemplateForm>({
  name: '', language: 'es', category: 'UTILITY', body_text: '', variables_example: [],
})
const variablesExampleText = ref('')

function openCreate() {
  form.name = ''
  form.language = 'es'
  form.category = 'UTILITY'
  form.body_text = ''
  variablesExampleText.value = ''
  showModal.value = true
}

async function submitTemplate() {
  if (!profileId.value) return
  saving.value = true
  try {
    form.variables_example = variablesExampleText.value
      ? variablesExampleText.value.split(',').map((v) => v.trim()).filter(Boolean)
      : []
    await createTemplate(profileId.value, form)
    toast.add({ title: 'Plantilla enviada a revisión de Meta', color: 'success' })
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDeleteTemplate(t: WhatsAppTemplate) {
  if (!profileId.value) return
  if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
  try {
    await deleteTemplate(profileId.value, t.id)
    toast.add({ title: 'Plantilla eliminada', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

const testTo = ref('')
async function handleTest(t: WhatsAppTemplate) {
  if (!profileId.value || !testTo.value) return
  try {
    await testTemplate(profileId.value, t.id, testTo.value)
    toast.add({ title: 'Mensaje de prueba enviado', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

function templateStatusColor(status: string) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED' || status === 'DISABLED') return 'error'
  if (status === 'PAUSED') return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4 space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-mauloasan-dark">WhatsApp</h1>
      <p class="text-sm text-gray-500">Número y plantillas de {{ activeOrigin?.profile.name }} — es igual para todas las aplicaciones</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-800">Número conectado</h2>
        </template>
        <div v-if="!account" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500">Todavía no hay ningún número conectado.</p>
            <UButton color="primary" :loading="connecting" @click="handleConnect">Conectar WhatsApp</UButton>
          </div>
          <div class="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
            <p class="font-medium mb-1">⚠️ Si ese número ya tiene la app de WhatsApp Business instalada en un celular</p>
            <p class="mb-2">Al conectar vas a ver dos opciones dentro de la ventana de Facebook:</p>
            <ul class="list-disc list-inside space-y-1">
              <li><strong>Conectar un número nuevo:</strong> el número se traslada acá y deja de funcionar normalmente en la app del celular.</li>
              <li><strong>Usar tu cuenta existente:</strong> el mismo número sigue funcionando en la app del celular en paralelo (modo compartido).</li>
            </ul>
          </div>
          <p class="text-xs text-gray-400">
            Si ves un error de Facebook ("Sorry, something went wrong"), probá en una ventana de
            incógnito o desactivá temporalmente tu bloqueador de anuncios/extensiones.
          </p>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">{{ account.display_phone_number || account.phone_number_id }}</p>
            <p class="text-xs text-gray-500">{{ account.verified_name }}</p>
            <UBadge v-if="account.is_coexistence" color="info" variant="subtle" class="mt-1">Coexistence</UBadge>
          </div>
          <UButton size="sm" color="error" variant="outline" :loading="disconnecting" @click="handleDisconnect">Desconectar</UButton>
        </div>
      </UCard>

      <UCard v-if="account">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-800">Plantillas</h2>
            <UButton size="sm" color="primary" icon="i-heroicons-plus" @click="openCreate">Nueva</UButton>
          </div>
        </template>
        <div v-if="!templates.length" class="text-sm text-gray-400 py-2">Sin plantillas todavía</div>
        <div v-else class="space-y-3">
          <div v-for="t in templates" :key="t.id" class="border border-gray-200 rounded-lg p-3">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-gray-900">{{ t.name }}</p>
              <UBadge :color="templateStatusColor(t.status)" variant="subtle">{{ t.status }}</UBadge>
            </div>
            <p class="text-sm text-gray-500 mb-2">{{ t.body_text }}</p>
            <p v-if="t.rejected_reason" class="text-xs text-red-600 mb-2">{{ t.rejected_reason }}</p>
            <div class="flex items-center gap-2">
              <UInput v-model="testTo" placeholder="59399xxxxxxx" size="xs" class="w-40" />
              <UButton size="xs" variant="outline" color="neutral" :disabled="t.status !== 'APPROVED' || !testTo" @click="handleTest(t)">
                Probar
              </UButton>
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="handleDeleteTemplate(t)" />
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <UModal v-model:open="showModal" title="Nueva plantilla">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitTemplate">
          <UFormField label="Nombre" name="name" help="Solo minúsculas y guiones bajos">
            <UInput v-model="form.name" required size="lg" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Idioma" name="language">
              <UInput v-model="form.language" placeholder="es" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Categoría" name="category">
              <USelectMenu
                v-model="form.category"
                :items="[{ label: 'Utilidad', value: 'UTILITY' }, { label: 'Marketing', value: 'MARKETING' }]"
                value-key="value"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField label="Texto" name="body_text" help="Usá {{1}}, {{2}}... para variables">
            <UTextarea v-model="form.body_text" :rows="4" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Valores de ejemplo" name="variables_example" help="Separados por coma, en orden — Meta los pide para aprobar la plantilla">
            <UInput v-model="variablesExampleText" placeholder="Juan, 20/07/2026" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="saving">Enviar a revisión</UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
