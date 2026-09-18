<script setup lang="ts">
import type { Subscription, Plan } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin, applicationName } = useZeusContext()
const { user } = useAuth()
const { list, updateStatus, scheduleAmountChange, createAddon, grantAddon, extendGrant } = useSubscriptions()
const { list: listProfiles } = useProfiles()
const { list: listPlans } = usePlans()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')
const subscriptions = ref<Subscription[]>([])
const profileNames = ref<Map<string, string>>(new Map())
const addonPlans = ref<Plan[]>([])
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

// Zeus ya no filtra por aplicación seleccionada (ver admin.vue) — se listan de una todas las
// suscripciones de origin, de cualquier aplicación, con una columna que indica a cuál pertenece cada una.
async function load() {
  if (!profileId.value) {
    subscriptions.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [subs, allProfiles, allPlans] = await Promise.all([
      list(profileId.value),
      listProfiles(),
      listPlans(profileId.value),
    ])
    subscriptions.value = subs.sort((a, b) => b.created_at.localeCompare(a.created_at))
    profileNames.value = new Map(allProfiles.map((p) => [p.id, p.name]))
    addonPlans.value = allPlans.filter((p) => p.is_addon && p.status === 'active')
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(profileId, load)

function statusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'suspended' || status === 'expired') return 'warning'
  if (status === 'cancelled') return 'error'
  return 'neutral'
}

async function suspend(s: Subscription) {
  if (!profileId.value) return
  if (!confirm('¿Suspender esta suscripción?')) return
  try {
    await updateStatus(profileId.value, s.id, { status: 'suspended' })
    toast.add({ title: 'Suscripción suspendida', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

// --- Programar cambio de precio (cupón que sube a precio normal, o adicional que arranca
// más adelante) — process.php lo aplica solo en el próximo cobro que caiga en o después de
// la fecha indicada, no cobra nada acá.
const showScheduleModal = ref(false)
const scheduling = ref(false)
const schedulingFor = ref<Subscription | null>(null)
const scheduleAmountUsd = ref(0)
const scheduleDate = ref('')

function openSchedule(s: Subscription) {
  schedulingFor.value = s
  scheduleAmountUsd.value = s.scheduled_amount ? s.scheduled_amount / 100 : s.amount / 100
  scheduleDate.value = s.scheduled_amount_effective_date ?? ''
  showScheduleModal.value = true
}

async function handleSchedule() {
  if (!profileId.value || !schedulingFor.value || !scheduleDate.value || !(scheduleAmountUsd.value > 0)) return
  scheduling.value = true
  try {
    await scheduleAmountChange(profileId.value, schedulingFor.value.id, {
      amount: Math.round(scheduleAmountUsd.value * 100),
      effective_date: scheduleDate.value,
    })
    toast.add({ title: 'Cambio de precio programado', color: 'success' })
    showScheduleModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    scheduling.value = false
  }
}

async function cancelSchedule() {
  if (!profileId.value || !schedulingFor.value) return
  scheduling.value = true
  try {
    await scheduleAmountChange(profileId.value, schedulingFor.value.id, { amount: null })
    toast.add({ title: 'Cambio programado cancelado', color: 'success' })
    showScheduleModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    scheduling.value = false
  }
}

// --- Agregar adicional (ej. paquete ecommerce) — crea una SEGUNDA suscripción reusando el
// token de la base, con su propia fecha de arranque (hoy o más adelante).
const showAddonModal = ref(false)
const addingAddon = ref(false)
const addonBaseFor = ref<Subscription | null>(null)
const addonPlanId = ref('')
const addonStartDate = ref('')

const addonPlanOptions = computed(() =>
  addonPlans.value
    .filter((p) => p.application_id === addonBaseFor.value?.application_id)
    .map((p) => ({ label: `${p.name} — $${p.price.toFixed(2)}`, value: p.id }))
)

function openAddon(s: Subscription) {
  addonBaseFor.value = s
  addonPlanId.value = ''
  addonStartDate.value = new Date().toISOString().slice(0, 10)
  showAddonModal.value = true
}

async function handleAddAddon() {
  if (!profileId.value || !addonBaseFor.value || !addonPlanId.value || !addonStartDate.value || !user.value?.id) return
  addingAddon.value = true
  try {
    await createAddon(profileId.value, addonBaseFor.value.id, {
      plan_id: addonPlanId.value,
      created_by: user.value.id,
      next_billing_date: addonStartDate.value,
    })
    toast.add({ title: 'Adicional agregado', color: 'success' })
    showAddonModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    addingAddon.value = false
  }
}

// --- Regalar add-on (cortesía) — igual que "Agregar adicional" pero sin exigir tarjeta
// tokenizada en la base, para clientes que siguen en trial. Requiere fecha de fin (no hay
// "gratis para siempre" implícito).
const showGrantAddonModal = ref(false)
const grantingAddon = ref(false)
const grantAddonBaseFor = ref<Subscription | null>(null)
const grantAddonPlanId = ref('')
const grantAddonEndDate = ref('')

const grantAddonPlanOptions = computed(() =>
  addonPlans.value
    .filter((p) => p.application_id === grantAddonBaseFor.value?.application_id)
    .map((p) => ({ label: `${p.name} — $${p.price.toFixed(2)}`, value: p.id }))
)

function openGrantAddon(s: Subscription) {
  grantAddonBaseFor.value = s
  grantAddonPlanId.value = ''
  grantAddonEndDate.value = ''
  showGrantAddonModal.value = true
}

async function handleGrantAddon() {
  if (!profileId.value || !grantAddonBaseFor.value || !grantAddonPlanId.value || !grantAddonEndDate.value || !user.value?.id) return
  grantingAddon.value = true
  try {
    await grantAddon(profileId.value, grantAddonBaseFor.value.id, {
      plan_id: grantAddonPlanId.value,
      created_by: user.value.id,
      end_date: grantAddonEndDate.value,
    })
    toast.add({ title: 'Add-on regalado', description: `Activo hasta ${grantAddonEndDate.value}`, color: 'success' })
    showGrantAddonModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    grantingAddon.value = false
  }
}

// --- Extender (cortesía) — mueve end_date/next_billing_date de una suscripción activa hacia
// adelante, sin tocar su método de pago. Sirve tanto para el plan base como para un add-on.
const showExtendModal = ref(false)
const extending = ref(false)
const extendFor = ref<Subscription | null>(null)
const extendEndDate = ref('')

function openExtend(s: Subscription) {
  extendFor.value = s
  extendEndDate.value = s.next_billing_date ?? ''
  showExtendModal.value = true
}

async function handleExtend() {
  if (!profileId.value || !extendFor.value || !extendEndDate.value) return
  extending.value = true
  try {
    await extendGrant(profileId.value, extendFor.value.id, extendEndDate.value)
    toast.add({ title: 'Suscripción extendida', description: `Activa hasta ${extendEndDate.value}`, color: 'success' })
    showExtendModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    extending.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Suscripciones</h1>
        <p class="text-sm text-gray-500">Suscripciones activas y pasadas de {{ activeOrigin?.profile.name }}, de todas las aplicaciones</p>
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

    <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Perfil</th>
            <th class="px-4 py-3 font-medium">Monto</th>
            <th class="px-4 py-3 font-medium">Próx. cobro</th>
            <th class="px-4 py-3 font-medium">Aplicación</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="s in filtered" :key="s.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ profileName(s.profile_id) }}</td>
            <td class="px-4 py-3 text-gray-500 tabular-nums">
              ${{ (s.amount / 100).toFixed(2) }}
              <span v-if="s.scheduled_amount" class="block text-xs text-brand-500">
                → ${{ (s.scheduled_amount / 100).toFixed(2) }} desde {{ s.scheduled_amount_effective_date }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ s.next_billing_date || '—' }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(s.application_id) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(s.status)" variant="subtle">{{ s.status }}</UBadge>
              <UBadge v-if="s.is_trial" color="info" variant="subtle" class="ml-1">trial</UBadge>
            </td>
            <td class="px-4 py-3 text-right space-x-1">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-clock" @click="openSchedule(s)">
                Programar precio
              </UButton>
              <UButton
                v-if="s.status === 'active' && addonPlans.some((p) => p.application_id === s.application_id)"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-plus-circle"
                @click="openAddon(s)"
              >
                Agregar adicional
              </UButton>
              <UButton
                v-if="s.status === 'active' && addonPlans.some((p) => p.application_id === s.application_id)"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-gift"
                @click="openGrantAddon(s)"
              >
                Regalar add-on
              </UButton>
              <UButton
                v-if="s.status === 'active'"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-calendar-days"
                @click="openExtend(s)"
              >
                Extender
              </UButton>
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

    <UModal v-model:open="showScheduleModal" title="Programar cambio de precio">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Se aplica solo, sin cobrar nada ahora — en el próximo cobro que caiga en o después de la
          fecha elegida, este pasa a ser el nuevo monto de la suscripción de {{ schedulingFor ? profileName(schedulingFor.profile_id) : '' }}.
        </p>
        <form class="space-y-4" @submit.prevent="handleSchedule">
          <UFormField label="Nuevo monto (USD)" name="amount">
            <UInput v-model.number="scheduleAmountUsd" type="number" step="0.01" min="0.01" required size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Vigente desde" name="effective_date">
            <UInput v-model="scheduleDate" type="date" required size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="scheduling">
            Programar
          </UButton>
          <UButton
            v-if="schedulingFor?.scheduled_amount"
            type="button"
            variant="ghost"
            color="error"
            block
            :loading="scheduling"
            @click="cancelSchedule"
          >
            Cancelar cambio programado
          </UButton>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="showAddonModal" title="Agregar adicional">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Crea una suscripción aparte para {{ addonBaseFor ? profileName(addonBaseFor.profile_id) : '' }}, reusando la
          misma tarjeta ya guardada — se puede cancelar sin afectar el plan base.
        </p>
        <form class="space-y-4" @submit.prevent="handleAddAddon">
          <UFormField label="Adicional" name="plan_id">
            <USelectMenu v-model="addonPlanId" :items="addonPlanOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Empieza a cobrarse desde" name="next_billing_date">
            <UInput v-model="addonStartDate" type="date" required size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="addingAddon" :disabled="!addonPlanId">
            Agregar
          </UButton>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="showGrantAddonModal" title="Regalar add-on">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Cortesía para {{ grantAddonBaseFor ? profileName(grantAddonBaseFor.profile_id) : '' }} —
          no exige tarjeta tokenizada en la base (sirve aunque siga en trial). Queda activo
          hasta la fecha que elijas; si el cliente agrega una tarjeta real después, se puede
          seguir cobrando normalmente desde ahí.
        </p>
        <form class="space-y-4" @submit.prevent="handleGrantAddon">
          <UFormField label="Add-on" name="plan_id">
            <USelectMenu v-model="grantAddonPlanId" :items="grantAddonPlanOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Activo hasta" name="end_date">
            <UInput v-model="grantAddonEndDate" type="date" required size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="grantingAddon" :disabled="!grantAddonPlanId || !grantAddonEndDate">
            Regalar add-on
          </UButton>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="showExtendModal" title="Extender suscripción">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Mueve la fecha de fin y de próximo cobro de la suscripción de
          {{ extendFor ? profileName(extendFor.profile_id) : '' }} — no toca el método de pago.
        </p>
        <form class="space-y-4" @submit.prevent="handleExtend">
          <UFormField label="Activa hasta" name="end_date">
            <UInput v-model="extendEndDate" type="date" required size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="extending" :disabled="!extendEndDate">
            Extender
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
