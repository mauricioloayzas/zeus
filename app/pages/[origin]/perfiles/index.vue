<script setup lang="ts">
import type { Profile, ProfileType } from '~/types'

definePageMeta({ layout: 'admin' })

const { list, create, update, updateStatus } = useProfiles()
const { activeOrigin } = useZeusContext()
const toast = useToast()

const allProfiles = ref<Profile[]>([])
const loading = ref(true)

// Profile no guarda a qué aplicación pertenece (ese vínculo vive en el RBAC, no en el
// perfil) — lo que SÍ tiene todo perfil es su cadena de parent_id hasta la raíz. Un perfil
// "es de esta app" si esa cadena termina en el origin activo, igual que el chequeo de acceso
// del backend (ProfileAccessMiddleware::resolveAncestorChain).
function belongsToActiveOrigin(profile: Profile, byId: Map<string, Profile>): boolean {
  if (profile.id === activeOrigin.value?.profile.id) return false // el origin mismo no es "un perfil de la app"
  let current: Profile | undefined = profile
  for (let i = 0; i < 5 && current; i++) {
    if (current.parent_id === activeOrigin.value?.profile.id) return true
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return false
}

const profiles = computed(() => {
  const byId = new Map(allProfiles.value.map((p) => [p.id, p]))
  return allProfiles.value.filter((p) => belongsToActiveOrigin(p, byId))
})

async function load() {
  loading.value = true
  try {
    allProfiles.value = await list()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => activeOrigin.value?.profile.id, load)

const typeOptions: { label: string, value: Exclude<ProfileType, 'service'> }[] = [
  { label: 'Empresa', value: 'company' },
  { label: 'Persona', value: 'person' },
  { label: 'Contador', value: 'contador' },
]
function typeLabel(t: string) {
  return typeOptions.find((o) => o.value === t)?.label ?? t
}

const showModal = ref(false)
const editing = ref<Profile | null>(null)
const saving = ref(false)
const form = reactive({ name: '', email: '', type: 'company' as Exclude<ProfileType, 'service'>, country_id: '', currency_id: '' })

function resetForm() {
  form.name = ''
  form.email = ''
  form.type = 'company'
  form.country_id = ''
  form.currency_id = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(p: Profile) {
  editing.value = p
  form.name = p.name
  form.email = p.email ?? ''
  form.type = p.type as Exclude<ProfileType, 'service'>
  form.country_id = p.country_id
  form.currency_id = p.currency_id
  showModal.value = true
}

async function handleSubmit() {
  if (!activeOrigin.value) return
  saving.value = true
  try {
    if (editing.value) {
      await update(editing.value.id, { name: form.name, email: form.email })
      toast.add({ title: 'Perfil actualizado', color: 'success' })
    } else {
      await create(activeOrigin.value.profile.id, {
        name: form.name,
        email: form.email,
        type: form.type,
        country_id: form.country_id || activeOrigin.value.profile.country_id,
        currency_id: form.currency_id || activeOrigin.value.profile.currency_id,
      })
      toast.add({ title: 'Perfil creado', color: 'success' })
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleStatus(p: Profile) {
  const next = p.status === 'active' ? 'inactive' : 'active'
  if (!confirm(`¿${next === 'active' ? 'Activar' : 'Desactivar'} el perfil "${p.name}"?`)) return
  try {
    await updateStatus(p.id, next)
    toast.add({ title: 'Estado actualizado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Perfiles</h1>
        <p class="text-sm text-gray-500">Empresas, personas y contadores de {{ activeOrigin?.application?.name ?? activeOrigin?.profile.name }}</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">Nuevo perfil</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!profiles.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-user-group" class="text-5xl mb-3" />
      <p>No hay perfiles registrados bajo esta aplicación todavía</p>
    </div>

    <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Nombre</th>
            <th class="px-4 py-3 font-medium">Email</th>
            <th class="px-4 py-3 font-medium">Tipo</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in profiles" :key="p.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-500">{{ p.email || '—' }}</td>
            <td class="px-4 py-3 text-gray-500">{{ typeLabel(p.type) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="p.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ p.status === 'active' ? 'Activo' : (p.status || 'active') }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEdit(p)" />
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-power" @click="toggleStatus(p)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="showModal" :title="editing ? 'Editar perfil' : 'Nuevo perfil'">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Nombre" name="name">
            <UInput v-model="form.name" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="form.email" type="email" required size="lg" class="w-full" />
          </UFormField>
          <UFormField v-if="!editing" label="Tipo" name="type">
            <USelectMenu v-model="form.type" :items="typeOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <p v-if="!editing" class="text-xs text-gray-400">
            País y moneda se heredan de {{ activeOrigin?.profile.name }} si no se especifican.
          </p>
          <UButton type="submit" color="primary" block size="lg" :loading="saving">
            {{ editing ? 'Guardar cambios' : 'Crear perfil' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
