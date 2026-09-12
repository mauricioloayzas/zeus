<script setup lang="ts">
import type { Application } from '~/types'

definePageMeta({ layout: 'admin' })

const { list, create, update, remove } = useApplications()
const toast = useToast()

const applications = ref<Application[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    applications.value = await list()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showModal = ref(false)
const editing = ref<Application | null>(null)
const saving = ref(false)
const form = reactive({ name: '', description: '', active: true })

function resetForm() {
  form.name = ''
  form.description = ''
  form.active = true
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(a: Application) {
  editing.value = a
  form.name = a.name
  form.description = a.description
  form.active = a.active
  showModal.value = true
}

async function handleSubmit() {
  saving.value = true
  try {
    if (editing.value) {
      await update(editing.value.id, { name: form.name, description: form.description, active: form.active })
      toast.add({ title: 'Aplicación actualizada', color: 'success' })
    } else {
      await create({ name: form.name, description: form.description, active: form.active })
      toast.add({ title: 'Aplicación creada', color: 'success' })
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDelete(a: Application) {
  if (!confirm(`¿Eliminar la aplicación "${a.name}"? Esto no elimina sus perfiles/planes existentes.`)) return
  try {
    await remove(a.id)
    toast.add({ title: 'Aplicación eliminada', color: 'success' })
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
        <h1 class="text-xl font-semibold text-gray-900">Aplicaciones</h1>
        <p class="text-sm text-gray-500">Las apps que corren bajo esta plataforma (Clichín, y las que vengan)</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">Nueva aplicación</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!applications.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-squares-2x2" class="text-5xl mb-3" />
      <p>Todavía no hay aplicaciones registradas</p>
    </div>

    <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Nombre</th>
            <th class="px-4 py-3 font-medium">Descripción</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="a in applications" :key="a.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ a.name }}</td>
            <td class="px-4 py-3 text-gray-500">{{ a.description || '—' }}</td>
            <td class="px-4 py-3">
              <UBadge :color="a.active ? 'success' : 'neutral'" variant="subtle">
                {{ a.active ? 'Activa' : 'Inactiva' }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEdit(a)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="handleDelete(a)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="showModal" :title="editing ? 'Editar aplicación' : 'Nueva aplicación'">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Nombre" name="name">
            <UInput v-model="form.name" placeholder="Ej. Hayayaku" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Descripción" name="description">
            <UInput v-model="form.description" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Activa" name="active">
            <USwitch v-model="form.active" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="saving">
            {{ editing ? 'Guardar cambios' : 'Crear aplicación' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
