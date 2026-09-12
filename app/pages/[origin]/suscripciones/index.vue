<script setup lang="ts">
import type { Subscription } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { getByApplication, updateStatus } = useSubscriptions()
const { list: listProfiles } = useProfiles()
const toast = useToast()

const applicationId = computed(() => activeOrigin.value?.application?.id ?? '')
const subscriptions = ref<Subscription[]>([])
const profileNames = ref<Map<string, string>>(new Map())
const loading = ref(true)

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Activa', value: 'active' },
  { label: 'Inactiva', value: 'inactive' },
  { label: 'Suspendida', value: 'suspended' },
  { label: 'Cancelada', value: 'cancelled' },
  { label: 'Vencida', value: 'expired' },
]
const statusFilter = ref('')

const filtered = computed(() => {
  if (!statusFilter.value) return subscriptions.value
  return subscriptions.value.filter((s) => s.status === statusFilter.value)
})

function profileName(id: string): string {
  return profileNames.value.get(id) ?? id
}

async function load() {
  if (!applicationId.value || !activeOrigin.value) {
    subscriptions.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [subs, allProfiles] = await Promise.all([
      getByApplication(activeOrigin.value.profile.id, applicationId.value),
      listProfiles(),
    ])
    subscriptions.value = subs.sort((a, b) => b.created_at.localeCompare(a.created_at))
    profileNames.value = new Map(allProfiles.map((p) => [p.id, p.name]))
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(applicationId, load)

function statusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'suspended' || status === 'expired') return 'warning'
  if (status === 'cancelled') return 'error'
  return 'neutral'
}

async function suspend(s: Subscription) {
  if (!activeOrigin.value) return
  if (!confirm('¿Suspender esta suscripción?')) return
  try {
    await updateStatus(activeOrigin.value.profile.id, s.id, { status: 'suspended' })
    toast.add({ title: 'Suscripción suspendida', color: 'success' })
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
        <h1 class="text-xl font-semibold text-gray-900">Suscripciones</h1>
        <p class="text-sm text-gray-500">Suscripciones activas y pasadas de {{ activeOrigin?.application?.name ?? '—' }}</p>
      </div>
      <USelectMenu v-model="statusFilter" :items="statusOptions" value-key="value" size="lg" class="w-48" />
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!filtered.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-credit-card" class="text-5xl mb-3" />
      <p>No hay suscripciones para mostrar</p>
    </div>

    <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Perfil</th>
            <th class="px-4 py-3 font-medium">Monto</th>
            <th class="px-4 py-3 font-medium">Próx. cobro</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="s in filtered" :key="s.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ profileName(s.profile_id) }}</td>
            <td class="px-4 py-3 text-gray-500 tabular-nums">${{ (s.amount / 100).toFixed(2) }}</td>
            <td class="px-4 py-3 text-gray-500">{{ s.next_billing_date || '—' }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(s.status)" variant="subtle">{{ s.status }}</UBadge>
              <UBadge v-if="s.is_trial" color="info" variant="subtle" class="ml-1">trial</UBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UButton
                v-if="s.status === 'active'"
                size="xs"
                variant="ghost"
                color="warning"
                icon="i-heroicons-pause"
                @click="suspend(s)"
              >
                Suspender
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
