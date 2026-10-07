<script setup lang="ts">
import type { Cliente } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin } = useZeusContext()
const { listPaged, create, update, remove } = useClientes()
const { tiposIdentificacion, clienteStatuses, ensure } = useCajaHelpers()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const tipoOptions = computed(() => tiposIdentificacion.value.map(o => ({ label: o.nombre, value: o.codigo })))
const statusOptions = computed(() => clienteStatuses.value.map(o => ({ label: o.nombre, value: o.codigo })))

function tipoLabel(value: string) {
  return tipoOptions.value.find(o => o.value === value)?.label ?? value
}
function statusLabel(value: string) {
  return statusOptions.value.find(o => o.value === value)?.label ?? value
}

const {
  items: clientes,
  loading,
  hasPrevious,
  hasNext,
  search,
  reset,
  previous,
  next,
} = useCursorPagination<Cliente>((cursor, search) => listPaged(profileId.value, cursor, 20, search))

async function load() {
  if (!profileId.value) return
  await reset()
}

onMounted(async () => {
  await Promise.all([ensure('tiposIdentificacion'), ensure('clienteStatuses')])
  await load()
})
watch(profileId, load)

const showModal = ref(false)
const editing = ref<Cliente | null>(null)
const saving = ref(false)
const form = reactive({
  tipo_identificacion: '04',
  identificacion: '',
  razon_social: '',
  direccion: '',
  email: '',
  telefono: '',
  status: 'active',
})

function resetForm() {
  form.tipo_identificacion = '04'
  form.identificacion = ''
  form.razon_social = ''
  form.direccion = ''
  form.email = ''
  form.telefono = ''
  form.status = 'active'
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(c: Cliente) {
  editing.value = c
  form.tipo_identificacion = c.tipo_identificacion
  form.identificacion = c.identificacion
  form.razon_social = c.razon_social
  form.direccion = c.direccion ?? ''
  form.email = c.email ?? ''
  form.telefono = c.telefono ?? ''
  form.status = c.status
  showModal.value = true
}

async function handleSubmit() {
  if (!profileId.value) return
  saving.value = true
  try {
    if (editing.value) {
      await update(profileId.value, editing.value.id, { ...form } as never)
      toast.add({ title: 'Cliente actualizado', color: 'success' })
    } else {
      await create(profileId.value, { ...form } as never)
      toast.add({ title: 'Cliente creado', color: 'success' })
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDelete(c: Cliente) {
  if (!profileId.value) return
  if (!confirm(`¿Eliminar el cliente "${c.razon_social}"?`)) return
  try {
    await remove(profileId.value, c.id)
    toast.add({ title: 'Cliente eliminado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Clientes</h1>
        <p class="text-sm text-gray-500">Compradores que puedes usar al emitir comprobantes electrónicos de {{ activeOrigin?.profile.name }}</p>
      </div>
      <UButton color="neutral" icon="i-heroicons-plus" @click="openCreate">Nuevo cliente</UButton>
    </div>

    <UInput
      v-model="search"
      icon="i-heroicons-magnifying-glass"
      placeholder="Buscar por razón social o identificación..."
      size="lg"
      class="mb-4 w-full max-w-sm"
    />

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!clientes.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-user-group" class="text-5xl mb-3" />
      <p>{{ search ? 'No hay clientes que coincidan con la búsqueda' : 'Aún no hay clientes registrados' }}</p>
    </div>

    <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Razón social</th>
            <th class="px-4 py-3 font-medium">Identificación</th>
            <th class="px-4 py-3 font-medium">Contacto</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="c in clientes" :key="c.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ c.razon_social }}</td>
            <td class="px-4 py-3 text-gray-500">
              {{ c.identificacion }}
              <span class="text-xs text-gray-400">({{ tipoLabel(c.tipo_identificacion) }})</span>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ c.email || c.telefono || '—' }}</td>
            <td class="px-4 py-3">
              <UBadge :color="c.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ statusLabel(c.status) }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEdit(c)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="handleDelete(c)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hasPrevious || hasNext" class="flex justify-center items-center gap-3 mt-4">
      <UButton size="sm" variant="outline" color="neutral" icon="i-heroicons-chevron-left" :disabled="!hasPrevious" @click="previous">
        Anterior
      </UButton>
      <UButton size="sm" variant="outline" color="neutral" trailing-icon="i-heroicons-chevron-right" :disabled="!hasNext" @click="next">
        Siguiente
      </UButton>
    </div>

    <UModal v-model:open="showModal" :title="editing ? 'Editar cliente' : 'Nuevo cliente'">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Tipo de identificación" name="tipo_identificacion">
              <USelectMenu v-model="form.tipo_identificacion" :items="tipoOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Identificación" name="identificacion">
              <UInput v-model="form.identificacion" required size="lg" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Razón social" name="razon_social">
            <UInput v-model="form.razon_social" placeholder="Nombre o razón social" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Dirección" name="direccion">
            <UInput v-model="form.direccion" size="lg" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Email" name="email">
              <UInput v-model="form.email" type="email" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Teléfono" name="telefono">
              <UInput v-model="form.telefono" size="lg" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Estado" name="status">
            <USelectMenu v-model="form.status" :items="statusOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="neutral" block size="lg" :loading="saving">
            {{ editing ? 'Guardar cambios' : 'Crear cliente' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
