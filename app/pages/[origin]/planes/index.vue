<script setup lang="ts">
import type { Plan } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { getOne, create, update, updateStatus } = usePlans()
const toast = useToast()

const applicationId = computed(() => activeOrigin.value?.application?.id ?? '')
const plans = ref<Plan[]>([])
const loading = ref(true)

async function load() {
  if (!applicationId.value) {
    plans.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    // No hay un "listar planes por aplicación" propio de origin — se reutiliza el mismo
    // endpoint que ya usa cualquier profile (getByApplication), consultado contra el origin.
    const { get } = useApi('collector')
    const res = await get<Plan[]>(`/profiles/${activeOrigin.value!.profile.id}/plans/application/${applicationId.value}`)
    plans.value = (res as unknown as { data: Plan[] }).data ?? []
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(applicationId, load)

const typeOptions = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
]
function typeLabel(t: string) {
  return typeOptions.find((o) => o.value === t)?.label ?? t
}

const showModal = ref(false)
const editing = ref<Plan | null>(null)
const saving = ref(false)
const form = reactive({ name: '', description: '', type: 'monthly', price: 0 })

function resetForm() {
  form.name = ''
  form.description = ''
  form.type = 'monthly'
  form.price = 0
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(p: Plan) {
  editing.value = p
  form.name = p.name
  form.description = p.description
  form.type = p.type
  form.price = p.price
  showModal.value = true
}

async function handleSubmit() {
  if (!activeOrigin.value || !applicationId.value) return
  saving.value = true
  try {
    if (editing.value) {
      await update(activeOrigin.value.profile.id, editing.value.id, {
        name: form.name,
        description: form.description,
        price: form.price,
      })
      toast.add({ title: 'Plan actualizado', color: 'success' })
    } else {
      await create(activeOrigin.value.profile.id, {
        application_id: applicationId.value,
        type: form.type,
        name: form.name,
        description: form.description,
        price: form.price,
      })
      toast.add({ title: 'Plan creado', color: 'success' })
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleStatus(p: Plan) {
  const next = p.status === 'active' ? 'inactive' : 'active'
  if (!activeOrigin.value) return
  try {
    await updateStatus(activeOrigin.value.profile.id, p.id, next)
    toast.add({ title: 'Estado actualizado', color: 'success' })
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
        <h1 class="text-xl font-semibold text-gray-900">Planes</h1>
        <p class="text-sm text-gray-500">Planes de suscripción de {{ activeOrigin?.application?.name ?? '—' }}</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" :disabled="!applicationId" @click="openCreate">Nuevo plan</UButton>
    </div>

    <p v-if="!applicationId" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      Este perfil "origin" no tiene una aplicación asociada en tu RBAC — no se pueden gestionar planes.
    </p>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="applicationId && !plans.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-tag" class="text-5xl mb-3" />
      <p>Aún no hay planes creados</p>
    </div>

    <div v-else-if="plans.length" class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Nombre</th>
            <th class="px-4 py-3 font-medium">Tipo</th>
            <th class="px-4 py-3 font-medium">Precio</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in plans" :key="p.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-500">{{ typeLabel(p.type) }}</td>
            <td class="px-4 py-3 text-gray-500 tabular-nums">${{ p.price.toFixed(2) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="p.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ p.status === 'active' ? 'Activo' : 'Inactivo' }}
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

    <UModal v-model:open="showModal" :title="editing ? 'Editar plan' : 'Nuevo plan'">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Nombre" name="name">
            <UInput v-model="form.name" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Descripción" name="description">
            <UInput v-model="form.description" size="lg" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Tipo" name="type">
              <USelectMenu v-model="form.type" :items="typeOptions" value-key="value" :disabled="!!editing" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Precio (USD)" name="price">
              <UInput v-model.number="form.price" type="number" step="0.01" min="0" required size="lg" class="w-full" />
            </UFormField>
          </div>
          <UButton type="submit" color="primary" block size="lg" :loading="saving">
            {{ editing ? 'Guardar cambios' : 'Crear plan' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
