<script setup lang="ts">
import type { Coupon, CouponForm, CuponModalidad, CuponPago, Profile } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { origins, activeOrigin } = useZeusContext()
const { list, create, update, listPagos, registrarPago, eliminarPago } = useCoupons()
const { list: listProfiles } = useProfiles()
const toast = useToast()

// Los cupones se listan por aplicación (GET /coupons requiere application_id) — a diferencia
// de Planes, que trae de una todos los de origin. Se necesita un selector propio en esta página.
const applicationOptions = computed(() =>
  origins.value.filter((o) => o.application).map((o) => ({ label: o.application!.name, value: o.application!.id }))
)
const selectedApplicationId = ref('')

const loading = ref(true)
const cupones = ref<Coupon[]>([])
const perfiles = ref<Profile[]>([])

async function load() {
  if (!selectedApplicationId.value) {
    cupones.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [cuponesRes, perfilesRes] = await Promise.all([
      list(selectedApplicationId.value),
      listProfiles(),
    ])
    cupones.value = cuponesRes
    perfiles.value = perfilesRes
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  selectedApplicationId.value = applicationOptions.value[0]?.value ?? ''
  load()
})
watch(selectedApplicationId, load)

function perfilesDelCupon(couponId: string): Profile[] {
  return perfiles.value.filter((p) => p.coupon_id === couponId)
}

const profileById = computed(() => new Map(perfiles.value.map((p) => [p.id, p])))
function profileName(id: string | null | undefined): string | null {
  if (!id) return null
  return profileById.value.get(id)?.name ?? null
}

// Profile no guarda a qué aplicación pertenece (ese vínculo vive en el RBAC/suscripción, no
// en el perfil) y los contadores nunca tienen suscripción (son siempre gratis, ni pasan por
// select-plan.vue) — así que filtrar por suscripción a la app los dejaba afuera del selector
// siempre. Se usa el mismo criterio que perfiles/index.vue: pertenece a este origin por su
// cadena de parent_id, sin importar la app.
function belongsToOrigin(profile: Profile): boolean {
  if (profile.id === activeOrigin.value?.profile.id) return false
  const byId = profileById.value
  let current: Profile | undefined = profile
  for (let i = 0; i < 5 && current; i++) {
    if (current.parent_id === activeOrigin.value?.profile.id) return true
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return false
}
const profileOptions = computed(() => [
  { label: 'Sin vincular (referido externo)', value: null },
  ...perfiles.value
    .filter((p) => belongsToOrigin(p))
    .map((p) => ({ label: p.name, value: p.id })),
])

function centavos(n: number) {
  return `$${(n / 100).toFixed(2)}`
}
function pendiente(c: Coupon) {
  return c.monto_generado - c.monto_pagado
}

// --- Resumen: cupones activos y perfiles creados por cada uno ---
const cuponesActivos = computed(() => cupones.value.filter((c) => c.status === 'active'))
const resumenChart = computed(() =>
  cuponesActivos.value
    .map((c) => ({ cupon: c, count: perfilesDelCupon(c.id).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
)
const maxResumenCount = computed(() => Math.max(1, ...resumenChart.value.map((r) => r.count)))
const totalPerfilesReferidos = computed(() => cupones.value.reduce((sum, c) => sum + perfilesDelCupon(c.id).length, 0))

const modalidadOptions: { label: string; value: CuponModalidad }[] = [
  { label: 'Pago único (100% del primer mes)', value: 'pago_unico' },
  { label: 'Comisión permanente (% de cada cobro)', value: 'comision_permanente' },
]
function modalidadLabel(m: CuponModalidad) {
  return modalidadOptions.find((o) => o.value === m)?.label ?? m
}
function duracionLabel(c: Coupon) {
  if (!c.descuento_porcentaje) return 'Sin descuento'
  if (c.descuento_num_periodos === null) return `${c.descuento_porcentaje}% siempre`
  return `${c.descuento_porcentaje}% por ${c.descuento_num_periodos} período${c.descuento_num_periodos === 1 ? '' : 's'}`
}

// --- Crear/editar ---
const showModal = ref(false)
const editing = ref<Coupon | null>(null)
const saving = ref(false)
const form = reactive<CouponForm>({
  application_id: '',
  codigo: '',
  vendedor_nombre: '',
  vendedor_telefono: '',
  vendedor_email: '',
  profile_id: null,
  descuento_porcentaje: 0,
  descuento_num_periodos: null,
  modalidad: 'pago_unico',
  comision_porcentaje: null,
})
// Radio "duración del descuento": simplifica elegir entre número de períodos y "siempre".
const duracionTipo = ref<'periodos' | 'siempre'>('periodos')

function resetForm() {
  form.application_id = selectedApplicationId.value || (applicationOptions.value[0]?.value ?? '')
  form.codigo = ''
  form.vendedor_nombre = ''
  form.vendedor_telefono = ''
  form.vendedor_email = ''
  form.profile_id = null
  form.descuento_porcentaje = 0
  form.descuento_num_periodos = 3
  form.modalidad = 'pago_unico'
  form.comision_porcentaje = null
  duracionTipo.value = 'periodos'
}

function openCreate() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(c: Coupon) {
  editing.value = c
  form.application_id = c.application_id
  form.codigo = c.codigo
  form.vendedor_nombre = c.vendedor_nombre
  form.vendedor_telefono = c.vendedor_telefono ?? ''
  form.vendedor_email = c.vendedor_email ?? ''
  form.profile_id = c.profile_id ?? null
  form.descuento_porcentaje = c.descuento_porcentaje
  form.descuento_num_periodos = c.descuento_num_periodos
  form.modalidad = c.modalidad
  form.comision_porcentaje = c.comision_porcentaje
  duracionTipo.value = c.descuento_num_periodos === null ? 'siempre' : 'periodos'
  showModal.value = true
}

async function handleSubmit() {
  saving.value = true
  try {
    const payload: CouponForm = {
      ...form,
      descuento_num_periodos: duracionTipo.value === 'siempre' ? null : (form.descuento_num_periodos || 1),
      comision_porcentaje: form.modalidad === 'comision_permanente' ? form.comision_porcentaje : null,
    }
    if (editing.value) {
      await update(editing.value.id, payload)
      toast.add({ title: 'Cupón actualizado', color: 'success' })
    } else {
      await create(payload)
      toast.add({ title: 'Cupón creado', color: 'success' })
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleStatus(c: Coupon) {
  try {
    await update(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })
    toast.add({ title: 'Estado actualizado', color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

// --- Pagos ---
const showPagosModal = ref(false)
const pagosDe = ref<Coupon | null>(null)
const pagos = ref<CuponPago[]>([])
const loadingPagos = ref(false)
const pagoForm = reactive({ monto: 0, fecha: new Date().toISOString().slice(0, 10), nota: '' })
const registrando = ref(false)

async function openPagos(c: Coupon) {
  pagosDe.value = c
  showPagosModal.value = true
  pagoForm.monto = 0
  pagoForm.fecha = new Date().toISOString().slice(0, 10)
  pagoForm.nota = ''
  loadingPagos.value = true
  try {
    pagos.value = await listPagos(c.id)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingPagos.value = false
  }
}

async function handleRegistrarPago() {
  if (!pagosDe.value || !pagoForm.monto) return
  registrando.value = true
  try {
    await registrarPago(pagosDe.value.id, pagoForm.monto, pagoForm.fecha, pagoForm.nota || undefined)
    toast.add({ title: 'Pago registrado', color: 'success' })
    await Promise.all([load(), openPagos(pagosDe.value)])
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    registrando.value = false
  }
}

const eliminandoPagoId = ref<string | null>(null)

// No hay "editar" un pago — se borra (revierte lo sumado a monto_pagado) y se vuelve a
// registrar con el monto correcto.
async function handleEliminarPago(pago: CuponPago) {
  if (!pagosDe.value) return
  if (!confirm(`¿Eliminar el pago de ${centavos(pago.monto)} del ${pago.fecha}? Esto revierte el monto pagado.`)) return
  eliminandoPagoId.value = pago.id
  try {
    await eliminarPago(pagosDe.value.id, pago.id)
    toast.add({ title: 'Pago eliminado', color: 'success' })
    await Promise.all([load(), openPagos(pagosDe.value)])
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    eliminandoPagoId.value = null
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Cupones / referidos</h1>
        <p class="text-sm text-gray-500">Códigos de vendedores — descuento al que compra, comisión al vendedor</p>
      </div>
      <div class="flex items-center gap-3">
        <USelectMenu
          v-model="selectedApplicationId"
          :items="applicationOptions"
          value-key="value"
          placeholder="Aplicación"
          class="w-48"
        />
        <UButton color="neutral" icon="i-heroicons-plus" :disabled="!selectedApplicationId" @click="openCreate">
          Nuevo cupón
        </UButton>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!cupones.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
      <UIcon name="i-heroicons-ticket" class="text-5xl mb-3" />
      <p>Todavía no hay cupones creados</p>
    </div>

    <template v-else>
      <div class="border border-gray-200 rounded-xl p-5 mb-6">
        <div class="flex items-center gap-6 mb-4">
          <div>
            <p class="text-xs text-gray-500">Cupones activos</p>
            <p class="text-xl font-semibold text-gray-900 tabular-nums">{{ cuponesActivos.length }}</p>
          </div>
          <div class="border-l border-gray-100 pl-6">
            <p class="text-xs text-gray-500">Perfiles creados por referido</p>
            <p class="text-xl font-semibold text-gray-900 tabular-nums">{{ totalPerfilesReferidos }}</p>
          </div>
        </div>

        <div v-if="resumenChart.length" class="space-y-2">
          <button
            v-for="r in resumenChart"
            :key="r.cupon.id"
            type="button"
            class="w-full flex items-center gap-3 text-left group"
            @click="openPagos(r.cupon)"
          >
            <span class="w-28 shrink-0 text-xs font-medium text-gray-700 truncate group-hover:text-gray-900">
              {{ r.cupon.codigo }}
            </span>
            <span class="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <span
                class="h-full bg-gray-900 group-hover:bg-gray-700 transition-colors rounded-full block"
                :style="{ width: `${Math.max((r.count / maxResumenCount) * 100, r.count > 0 ? 4 : 0)}%` }"
              />
            </span>
            <span class="w-6 shrink-0 text-xs text-gray-500 tabular-nums text-right">{{ r.count }}</span>
          </button>
        </div>
        <p v-else class="text-xs text-gray-400">Todavía ningún perfil se creó con un cupón activo.</p>
      </div>

      <div class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Código / vendedor</th>
            <th class="px-4 py-3 font-medium">Descuento</th>
            <th class="px-4 py-3 font-medium">Modalidad</th>
            <th class="px-4 py-3 font-medium text-right">Perfiles</th>
            <th class="px-4 py-3 font-medium text-right">Generado</th>
            <th class="px-4 py-3 font-medium text-right">Pagado</th>
            <th class="px-4 py-3 font-medium text-right">Pendiente</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="c in cupones" :key="c.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ c.codigo }}</p>
              <p class="text-xs text-gray-500">{{ c.vendedor_nombre }}</p>
              <p class="text-xs text-gray-400">{{ c.vendedor_telefono }} · {{ c.vendedor_email }}</p>
              <p v-if="profileName(c.profile_id)" class="text-xs text-gray-400 mt-0.5">
                <UIcon name="i-heroicons-link" class="inline -mt-0.5" />
                Vinculado a {{ profileName(c.profile_id) }}
              </p>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ duracionLabel(c) }}</td>
            <td class="px-4 py-3 text-gray-600">
              {{ modalidadLabel(c.modalidad) }}
              <span v-if="c.modalidad === 'comision_permanente'" class="text-gray-400">({{ c.comision_porcentaje }}%)</span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">{{ perfilesDelCupon(c.id).length }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ centavos(c.monto_generado) }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ centavos(c.monto_pagado) }}</td>
            <td class="px-4 py-3 text-right tabular-nums font-medium" :class="pendiente(c) > 0 ? 'text-amber-700' : 'text-gray-900'">
              {{ centavos(pendiente(c)) }}
            </td>
            <td class="px-4 py-3">
              <UBadge :color="c.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ c.status === 'active' ? 'Activo' : 'Inactivo' }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-banknotes" @click="openPagos(c)" />
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEdit(c)" />
              <UButton
                size="xs" variant="ghost" color="neutral"
                :icon="c.status === 'active' ? 'i-heroicons-pause' : 'i-heroicons-play'"
                @click="toggleStatus(c)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>

    <!-- Crear/editar -->
    <UModal v-model:open="showModal" :title="editing ? 'Editar cupón' : 'Nuevo cupón'">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField v-if="!editing" label="Aplicación" name="application_id">
            <USelectMenu v-model="form.application_id" :items="applicationOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Código" name="codigo">
            <UInput v-model="form.codigo" placeholder="JUAN2026" :disabled="!!editing" size="lg" class="w-full" />
          </UFormField>

          <div class="border-t border-gray-100 pt-3">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Vendedor</p>
            <div class="space-y-3">
              <UFormField label="Nombre" name="vendedor_nombre">
                <UInput v-model="form.vendedor_nombre" required size="lg" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Teléfono" name="vendedor_telefono">
                  <UInput v-model="form.vendedor_telefono" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Email" name="vendedor_email">
                  <UInput v-model="form.vendedor_email" type="email" size="lg" class="w-full" />
                </UFormField>
              </div>
              <UFormField label="Vincular a un perfil existente (opcional)" name="profile_id">
                <USelectMenu v-model="form.profile_id" :items="profileOptions" value-key="value" size="lg" class="w-full" />
              </UFormField>
              <p class="text-xs text-gray-400 -mt-2">
                Solo si el vendedor ya tiene su propio perfil en la plataforma (ej. un contador) — igual de opcional que dejarlo vacío para un referido externo. Si es un contador, el perfil nuevo que use este cupón quedará automáticamente como su hijo.
              </p>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-3">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Descuento al cliente (opcional)</p>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <UFormField label="% de descuento">
                <UInput v-model.number="form.descuento_porcentaje" type="number" min="0" max="100" step="0.01" size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Duración">
                <USelectMenu
                  v-model="duracionTipo"
                  :items="[{ label: 'N períodos', value: 'periodos' }, { label: 'Siempre', value: 'siempre' }]"
                  value-key="value"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField v-if="duracionTipo === 'periodos'" label="Cantidad de períodos con descuento (meses si el plan es mensual, años si es anual)">
              <UInput v-model.number="form.descuento_num_periodos" type="number" min="1" size="lg" class="w-full" />
            </UFormField>
          </div>

          <div class="border-t border-gray-100 pt-3">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Comisión del vendedor</p>
            <p class="text-xs text-gray-400 mb-2">Nunca las dos a la vez — elige una.</p>
            <UFormField label="Modalidad">
              <USelectMenu v-model="form.modalidad" :items="modalidadOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField v-if="form.modalidad === 'comision_permanente'" label="% de cada cobro" class="mt-3">
              <UInput v-model.number="form.comision_porcentaje" type="number" min="0.01" max="100" step="0.01" size="lg" class="w-full" />
            </UFormField>
            <p v-else class="text-xs text-gray-500 mt-2">
              Se le pagará el 100% del primer cobro real (valor del plan mensual, aunque el perfil compre un plan anual — no una fracción del anual).
            </p>
          </div>

          <UButton type="submit" color="neutral" block size="lg" :loading="saving">
            {{ editing ? 'Guardar cambios' : 'Crear cupón' }}
          </UButton>
        </form>
      </template>
    </UModal>

    <!-- Pagos -->
    <UModal v-model:open="showPagosModal" :title="pagosDe ? `Pagos — ${pagosDe.codigo}` : 'Pagos'">
      <template #body>
        <div v-if="pagosDe" class="space-y-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-lg border border-gray-200 py-3">
              <p class="text-xs text-gray-500">Generado</p>
              <p class="font-semibold text-gray-900">{{ centavos(pagosDe.monto_generado) }}</p>
            </div>
            <div class="rounded-lg border border-gray-200 py-3">
              <p class="text-xs text-gray-500">Pagado</p>
              <p class="font-semibold text-gray-900">{{ centavos(pagosDe.monto_pagado) }}</p>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 py-3">
              <p class="text-xs text-amber-700">Pendiente</p>
              <p class="font-semibold text-amber-800">{{ centavos(pendiente(pagosDe)) }}</p>
            </div>
          </div>

          <form v-if="pendiente(pagosDe) > 0" class="border border-gray-200 rounded-lg p-3 space-y-2" @submit.prevent="handleRegistrarPago">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Registrar pago (ya transferido por fuera del sistema)</p>
            <div class="grid grid-cols-2 gap-2">
              <UInput v-model.number="pagoForm.monto" type="number" min="0.01" step="0.01" placeholder="Monto" size="sm" />
              <UInput v-model="pagoForm.fecha" type="date" size="sm" />
            </div>
            <UInput v-model="pagoForm.nota" placeholder="Nota (opcional)" size="sm" class="w-full" />
            <UButton type="submit" size="sm" color="neutral" block :loading="registrando">Registrar</UButton>
          </form>

          <div v-if="loadingPagos" class="text-sm text-gray-400 text-center py-4">Cargando…</div>
          <ul v-else-if="pagos.length" class="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            <li v-for="p in pagos" :key="p.id" class="px-3 py-2 flex items-center justify-between text-sm">
              <div>
                <p class="text-gray-900">{{ p.fecha }}</p>
                <p v-if="p.nota" class="text-xs text-gray-500">{{ p.nota }}</p>
              </div>
              <div class="flex items-center gap-2">
                <p class="font-medium text-gray-900">{{ centavos(p.monto) }}</p>
                <UButton
                  size="xs" variant="ghost" color="error" icon="i-heroicons-trash"
                  :loading="eliminandoPagoId === p.id"
                  @click="handleEliminarPago(p)"
                />
              </div>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400 text-center py-4">Sin pagos registrados todavía.</p>
        </div>
      </template>
    </UModal>
  </div>
</template>
