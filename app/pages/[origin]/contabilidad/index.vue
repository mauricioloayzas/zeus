<script setup lang="ts">
import type { Factura, CuentaContableProfile, MayorContable } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { list: listFacturas } = useFacturas()
const { list: listCuentas } = useCuentasContables()
const { listByCuenta } = useMayorContable()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const tab = ref<'facturas' | 'mayor'>('facturas')

// --- Facturas ---
const facturas = ref<Factura[]>([])
const loadingFacturas = ref(true)

async function loadFacturas() {
  if (!profileId.value) return
  loadingFacturas.value = true
  try {
    facturas.value = (await listFacturas(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingFacturas.value = false
  }
}

function estadoColor(estado: string) {
  if (estado === 'autorizado') return 'success'
  if (estado === 'rechazado' || estado === 'anulado') return 'error'
  return 'neutral'
}

// --- Libro mayor ---
const cuentas = ref<CuentaContableProfile[]>([])
const selectedCuentaId = ref<string>('')
const mayor = ref<MayorContable[]>([])
const loadingCuentas = ref(true)
const loadingMayor = ref(false)

const cuentaOptions = computed(() =>
  cuentas.value.filter((c) => c.es_detalle).map((c) => ({ label: `${c.codigo} — ${c.nombre}`, value: c.id }))
)

async function loadCuentas() {
  if (!profileId.value) return
  loadingCuentas.value = true
  try {
    cuentas.value = await listCuentas(profileId.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingCuentas.value = false
  }
}

async function loadMayor() {
  if (!profileId.value || !selectedCuentaId.value) {
    mayor.value = []
    return
  }
  loadingMayor.value = true
  try {
    mayor.value = (await listByCuenta(profileId.value, selectedCuentaId.value)).sort((a, b) => (a.anio + a.mes).localeCompare(b.anio + b.mes))
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingMayor.value = false
  }
}

watch(selectedCuentaId, loadMayor)
watch(profileId, () => {
  loadFacturas()
  loadCuentas()
  selectedCuentaId.value = ''
})
onMounted(() => {
  loadFacturas()
  loadCuentas()
})
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Contabilidad</h1>
      <p class="text-sm text-gray-500">Facturas emitidas y libro mayor de {{ activeOrigin?.profile.name }}</p>
    </div>

    <div class="flex gap-2 mb-6 border-b border-gray-200">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="tab === 'facturas' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'"
        @click="tab = 'facturas'"
      >
        Facturas
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="tab === 'mayor' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'"
        @click="tab = 'mayor'"
      >
        Libro mayor
      </button>
    </div>

    <div v-if="tab === 'facturas'">
      <div v-if="loadingFacturas" class="flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
      </div>
      <div v-else-if="!facturas.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
        <UIcon name="i-heroicons-document-text" class="text-5xl mb-3" />
        <p>Todavía no se ha emitido ninguna factura</p>
      </div>
      <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">Secuencial</th>
              <th class="px-4 py-3 font-medium">Comprador</th>
              <th class="px-4 py-3 font-medium">Fecha</th>
              <th class="px-4 py-3 font-medium">Total</th>
              <th class="px-4 py-3 font-medium">Origen</th>
              <th class="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="f in facturas" :key="f.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">
                {{ f.info_tributaria.estab }}-{{ f.info_tributaria.ptoEmi }}-{{ f.info_tributaria.secuencial }}
              </td>
              <td class="px-4 py-3 text-gray-500">{{ f.info_factura.razonSocialComprador }}</td>
              <td class="px-4 py-3 text-gray-500">{{ f.info_factura.fechaEmision }}</td>
              <td class="px-4 py-3 text-gray-500 tabular-nums">${{ f.info_factura.importeTotal.toFixed(2) }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">
                {{ f.info_adicional?.subscription_id ? 'Suscripción' : (f.info_adicional?.cita_id ? 'Cita' : '—') }}
              </td>
              <td class="px-4 py-3">
                <UBadge :color="estadoColor(f.estado)" variant="subtle">{{ f.estado }}</UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else>
      <div v-if="loadingCuentas" class="flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
      </div>
      <template v-else>
        <UFormField label="Cuenta" name="cuenta" class="mb-4 max-w-sm">
          <USelectMenu
            v-model="selectedCuentaId"
            :items="cuentaOptions"
            value-key="value"
            placeholder="Elegí una cuenta postable"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <div v-if="loadingMayor" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
        </div>
        <div v-else-if="selectedCuentaId && !mayor.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <p>Esta cuenta no tiene movimientos todavía</p>
        </div>
        <div v-else-if="mayor.length" class="border border-gray-200 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Periodo</th>
                <th class="px-4 py-3 font-medium text-right">Debe</th>
                <th class="px-4 py-3 font-medium text-right">Haber</th>
                <th class="px-4 py-3 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="m in mayor" :key="m.id">
                <td class="px-4 py-3 text-gray-900 tabular-nums">{{ m.anio }}-{{ m.mes }}</td>
                <td class="px-4 py-3 text-right tabular-nums">${{ m.debe.toFixed(2) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">${{ m.haber.toFixed(2) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-medium">${{ m.saldo.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
