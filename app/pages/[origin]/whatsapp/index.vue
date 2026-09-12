<script setup lang="ts">
import type { Profile, WhatsAppAccount, WhatsAppTemplate, WhatsAppTemplateForm } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { list: listProfiles } = useProfiles()
const { getAccount, disconnect, listTemplates, createTemplate, deleteTemplate, testTemplate } = useWhatsApp()
const toast = useToast()

const allProfiles = ref<Profile[]>([])
const selectedProfileId = ref<string>('')

// Mismo criterio de "pertenece a esta app" que perfiles/index.vue — acá se incluye también
// el propio origin, porque origin también puede tener su propio WhatsApp Business.
function belongsToActiveOrigin(profile: Profile, byId: Map<string, Profile>): boolean {
  if (profile.id === activeOrigin.value?.profile.id) return true
  let current: Profile | undefined = profile
  for (let i = 0; i < 5 && current; i++) {
    if (current.parent_id === activeOrigin.value?.profile.id) return true
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return false
}

const profileOptions = computed(() => {
  const byId = new Map(allProfiles.value.map((p) => [p.id, p]))
  return allProfiles.value
    .filter((p) => belongsToActiveOrigin(p, byId))
    .map((p) => ({ label: p.name, value: p.id }))
})

const account = ref<WhatsAppAccount | null>(null)
const templates = ref<WhatsAppTemplate[]>([])
const loading = ref(false)

async function loadProfiles() {
  allProfiles.value = await listProfiles().catch(() => [])
  if (activeOrigin.value) selectedProfileId.value = activeOrigin.value.profile.id
}
onMounted(loadProfiles)
watch(() => activeOrigin.value?.profile.id, loadProfiles)

async function load() {
  if (!selectedProfileId.value) return
  loading.value = true
  try {
    const [acc, tpls] = await Promise.all([
      getAccount(selectedProfileId.value),
      listTemplates(selectedProfileId.value),
    ])
    account.value = acc
    templates.value = tpls
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
watch(selectedProfileId, load, { immediate: true })

async function handleDisconnect() {
  if (!selectedProfileId.value) return
  if (!confirm('¿Desconectar el número de WhatsApp de este perfil?')) return
  try {
    await disconnect(selectedProfileId.value)
    toast.add({ title: 'Número desconectado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

const showModal = ref(false)
const saving = ref(false)
const form = reactive<WhatsAppTemplateForm>({
  name: '', language: 'es', category: 'UTILITY', body_text: '', variables_example: [],
})

function openCreate() {
  form.name = ''
  form.language = 'es'
  form.category = 'UTILITY'
  form.body_text = ''
  form.variables_example = []
  showModal.value = true
}

async function submitTemplate() {
  if (!selectedProfileId.value) return
  saving.value = true
  try {
    await createTemplate(selectedProfileId.value, form)
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
  if (!selectedProfileId.value) return
  if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
  try {
    await deleteTemplate(selectedProfileId.value, t.id)
    toast.add({ title: 'Plantilla eliminada', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

const testTo = ref('')
async function handleTest(t: WhatsAppTemplate) {
  if (!selectedProfileId.value || !testTo.value) return
  try {
    await testTemplate(selectedProfileId.value, t.id, testTo.value)
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
      <h1 class="text-xl font-semibold text-gray-900">WhatsApp</h1>
      <p class="text-sm text-gray-500">Configurá el número y las plantillas de cualquier perfil de la aplicación</p>
    </div>

    <UFormField label="Perfil" name="profile" class="max-w-sm">
      <USelectMenu v-model="selectedProfileId" :items="profileOptions" value-key="value" size="lg" class="w-full" />
    </UFormField>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else-if="selectedProfileId">
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-800">Número conectado</h2>
        </template>
        <div v-if="!account" class="text-sm text-gray-400 py-2">
          Este perfil todavía no conectó ningún número de WhatsApp. La conexión inicial
          (Embedded Signup de Meta) se hace desde el propio perfil, en caja-registradora.
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">{{ account.display_phone_number || account.phone_number_id }}</p>
            <p class="text-xs text-gray-500">{{ account.verified_name }}</p>
            <UBadge v-if="account.is_coexistence" color="info" variant="subtle" class="mt-1">Coexistence</UBadge>
          </div>
          <UButton size="sm" color="error" variant="outline" @click="handleDisconnect">Desconectar</UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-800">Plantillas</h2>
            <UButton size="sm" color="neutral" icon="i-heroicons-plus" :disabled="!account" @click="openCreate">Nueva</UButton>
          </div>
        </template>
        <div v-if="!account" class="text-sm text-gray-400 py-2">Conectá un número primero para poder crear plantillas.</div>
        <div v-else-if="!templates.length" class="text-sm text-gray-400 py-2">Sin plantillas todavía</div>
        <div v-else class="space-y-3">
          <div v-for="t in templates" :key="t.id" class="border border-gray-200 rounded-lg p-3">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-gray-900">{{ t.name }}</p>
              <UBadge :color="templateStatusColor(t.status)" variant="subtle">{{ t.status }}</UBadge>
            </div>
            <p class="text-sm text-gray-500 mb-2">{{ t.body_text }}</p>
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
          <UFormField label="Categoría" name="category">
            <USelectMenu
              v-model="form.category"
              :items="[{ label: 'Utilidad', value: 'UTILITY' }, { label: 'Marketing', value: 'MARKETING' }]"
              value-key="value"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Texto" name="body_text" help="Usá {{1}}, {{2}}... para variables">
            <UTextarea v-model="form.body_text" :rows="4" required size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="neutral" block size="lg" :loading="saving">Enviar a revisión</UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
