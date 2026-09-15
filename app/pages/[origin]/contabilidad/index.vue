<script setup lang="ts">
import type {
  CuentaContableProfile, MayorContable, AsientoContable,
  BalanceGeneral, EstadoResultados, EstadoFlujoEfectivo,
} from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin } = useZeusContext()
const { list: listCuentas, activar } = useCuentasContables()
const { listByCuenta } = useMayorContable()
const { list: listAsientos, getOne: getAsiento, create: crearAsiento, remove: eliminarAsiento } = useAsientosContables()
const {
  balanceGeneral, balanceGeneralPdf,
  estadoResultados, estadoResultadosPdf,
  flujoEfectivo, flujoEfectivoPdf,
} = useReportesContables()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const cuentas = ref<CuentaContableProfile[]>([])
const loadingCuentas = ref(true)
const activando = ref(false)

async function handleActivar() {
  if (!profileId.value) return
  activando.value = true
  try {
    const res = await activar(profileId.value)
    if (res.already_initialized) {
      toast.add({ title: 'El módulo ya estaba activado', color: 'neutral' })
    } else {
      toast.add({ title: `Plan de cuentas NIIF cargado (${res.cuentas} cuentas)`, color: 'success' })
    }
    await loadCuentas()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    activando.value = false
  }
}

const cuentaOptions = computed(() =>
  cuentas.value.filter((c) => c.es_detalle).map((c) => ({ label: `${c.codigo} — ${c.nombre}`, value: c.id }))
)
const cuentaOptionsActivas = computed(() =>
  cuentas.value.filter((c) => c.es_detalle && c.status === 'active').map((c) => ({ label: `${c.codigo} — ${c.nombre}`, value: c.id }))
)
const nombresCuenta = computed(() => Object.fromEntries(cuentas.value.map((c) => [c.id, `${c.codigo} — ${c.nombre}`])))

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
onMounted(loadCuentas)
watch(profileId, loadCuentas)

function formatMonto(n: number): string {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Tabs ---
type TabKey = 'mayor' | 'asientos' | 'reportes'
const tabs: { key: TabKey, label: string, icon: string }[] = [
  { key: 'mayor', label: 'Libro mayor', icon: 'i-heroicons-book-open' },
  { key: 'asientos', label: 'Asientos', icon: 'i-heroicons-pencil-square' },
  { key: 'reportes', label: 'Reportes', icon: 'i-heroicons-document-chart-bar' },
]
const activeTab = ref<TabKey>('mayor')
const loadedTabs = new Set<TabKey>()

watch(activeTab, (tab) => {
  if (loadedTabs.has(tab)) return
  loadedTabs.add(tab)
  if (tab === 'asientos') loadAsientos()
  if (tab === 'reportes') {
    cargarBalance()
    cargarResultados()
    cargarFlujo()
  }
})

// --- Libro mayor ---
const selectedCuentaId = ref<string>('')
const mayor = ref<MayorContable[]>([])
const loadingMayor = ref(false)

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

// --- Asientos ---
const asientos = ref<AsientoContable[]>([])
const loadingAsientos = ref(false)
const expandido = ref<string | null>(null)
const cargandoDetalle = ref(false)

async function loadAsientos() {
  if (!profileId.value) return
  loadingAsientos.value = true
  try {
    asientos.value = await listAsientos(profileId.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingAsientos.value = false
  }
}

function totalAsiento(a: AsientoContable): number {
  return (a.detalles ?? []).reduce((sum, d) => sum + d.debe, 0)
}

async function toggleAsiento(a: AsientoContable) {
  if (expandido.value === a.id) {
    expandido.value = null
    return
  }
  expandido.value = a.id
  if (!a.detalles && profileId.value) {
    cargandoDetalle.value = true
    try {
      const completo = await getAsiento(profileId.value, a.id)
      const idx = asientos.value.findIndex((x) => x.id === a.id)
      if (idx >= 0) asientos.value[idx] = completo
    } catch (e: unknown) {
      toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
    } finally {
      cargandoDetalle.value = false
    }
  }
}

async function handleDeleteAsiento(a: AsientoContable) {
  if (!profileId.value) return
  if (!confirm(`¿Eliminar el asiento del ${a.fecha}? No revierte sus saldos ya mayorizados.`)) return
  try {
    await eliminarAsiento(profileId.value, a.id)
    toast.add({ title: 'Asiento eliminado', color: 'success' })
    await loadAsientos()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}

const showNuevoAsiento = ref(false)
const guardandoAsiento = ref(false)
const fechaAsiento = ref(new Date().toISOString().slice(0, 10))
const descripcionAsiento = ref('')

interface Linea { cuenta_id: string, debe: string, haber: string }
const lineasAsiento = ref<Linea[]>([
  { cuenta_id: '', debe: '', haber: '' },
  { cuenta_id: '', debe: '', haber: '' },
])

function abrirNuevoAsiento() {
  fechaAsiento.value = new Date().toISOString().slice(0, 10)
  descripcionAsiento.value = ''
  lineasAsiento.value = [
    { cuenta_id: '', debe: '', haber: '' },
    { cuenta_id: '', debe: '', haber: '' },
  ]
  showNuevoAsiento.value = true
}

function agregarLinea() {
  lineasAsiento.value.push({ cuenta_id: '', debe: '', haber: '' })
}
function quitarLinea(i: number) {
  if (lineasAsiento.value.length > 2) lineasAsiento.value.splice(i, 1)
}

const totalDebe = computed(() => lineasAsiento.value.reduce((s, l) => s + (Number(l.debe) || 0), 0))
const totalHaber = computed(() => lineasAsiento.value.reduce((s, l) => s + (Number(l.haber) || 0), 0))
const balanceado = computed(() => totalDebe.value > 0 && Math.abs(totalDebe.value - totalHaber.value) < 0.005)

async function handleCrearAsiento() {
  if (!profileId.value || !balanceado.value) return

  const entries = lineasAsiento.value
    .filter((l) => l.cuenta_id && (Number(l.debe) > 0 || Number(l.haber) > 0))
    .map((l) => ({ cuenta_id: l.cuenta_id, debe: Number(l.debe) || 0, haber: Number(l.haber) || 0 }))

  if (entries.length < 2) {
    toast.add({ title: 'El asiento necesita al menos dos líneas con cuenta y monto', color: 'error' })
    return
  }

  guardandoAsiento.value = true
  try {
    await crearAsiento(profileId.value, { fecha: fechaAsiento.value, descripcion: descripcionAsiento.value, entries })
    toast.add({ title: 'Asiento registrado', color: 'success' })
    showNuevoAsiento.value = false
    await loadAsientos()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    guardandoAsiento.value = false
  }
}

// --- Reportes ---
function descargarBase64(base64: string, mimeType: string, filename: string) {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const mesOptions = [
  { label: 'Enero', value: '01' }, { label: 'Febrero', value: '02' }, { label: 'Marzo', value: '03' },
  { label: 'Abril', value: '04' }, { label: 'Mayo', value: '05' }, { label: 'Junio', value: '06' },
  { label: 'Julio', value: '07' }, { label: 'Agosto', value: '08' }, { label: 'Septiembre', value: '09' },
  { label: 'Octubre', value: '10' }, { label: 'Noviembre', value: '11' }, { label: 'Diciembre', value: '12' },
]

// Balance General
const fechaCorte = ref(new Date().toISOString().slice(0, 10))
const loadingBalance = ref(false)
const descargandoBalance = ref(false)
const balance = ref<BalanceGeneral | null>(null)
const lineasBalanceConMovimiento = computed(() => (balance.value?.lineas ?? []).filter((l) => Math.abs(l.valor) > 0.005))

async function cargarBalance() {
  if (!profileId.value) return
  loadingBalance.value = true
  try {
    balance.value = await balanceGeneral(profileId.value, fechaCorte.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingBalance.value = false
  }
}

async function descargarBalancePdf() {
  if (!profileId.value) return
  descargandoBalance.value = true
  try {
    const res = await balanceGeneralPdf(profileId.value, fechaCorte.value)
    descargarBase64(res.contenido_base64, res.mime_type, res.filename)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    descargandoBalance.value = false
  }
}

// Estado de Resultados
const anioActual = String(new Date().getFullYear())
const anio = ref(anioActual)
const mesDesde = ref('01')
const mesHasta = ref('12')
const loadingResultados = ref(false)
const descargandoResultados = ref(false)
const resultados = ref<EstadoResultados | null>(null)

async function cargarResultados() {
  if (!profileId.value) return
  loadingResultados.value = true
  try {
    resultados.value = await estadoResultados(profileId.value, anio.value, mesDesde.value, mesHasta.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingResultados.value = false
  }
}

async function descargarResultadosPdf() {
  if (!profileId.value) return
  descargandoResultados.value = true
  try {
    const res = await estadoResultadosPdf(profileId.value, anio.value, mesDesde.value, mesHasta.value)
    descargarBase64(res.contenido_base64, res.mime_type, res.filename)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    descargandoResultados.value = false
  }
}

// Flujo de Efectivo
const anioFlujo = ref(anioActual)
const mesDesdeFlujo = ref('01')
const mesHastaFlujo = ref('12')
const loadingFlujo = ref(false)
const descargandoFlujo = ref(false)
const flujo = ref<EstadoFlujoEfectivo | null>(null)

async function cargarFlujo() {
  if (!profileId.value) return
  loadingFlujo.value = true
  try {
    flujo.value = await flujoEfectivo(profileId.value, anioFlujo.value, mesDesdeFlujo.value, mesHastaFlujo.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingFlujo.value = false
  }
}

async function descargarFlujoPdf() {
  if (!profileId.value) return
  descargandoFlujo.value = true
  try {
    const res = await flujoEfectivoPdf(profileId.value, anioFlujo.value, mesDesdeFlujo.value, mesHastaFlujo.value)
    descargarBase64(res.contenido_base64, res.mime_type, res.filename)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    descargandoFlujo.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Contabilidad</h1>
      <p class="text-sm text-gray-500">Libro mayor, asientos y reportes NIIF de {{ activeOrigin?.profile.name }}</p>
    </div>

    <div v-if="loadingCuentas" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>
    <div v-else-if="!cuentas.length" class="border border-gray-200 rounded-xl p-10 text-center mt-6">
      <UIcon name="i-heroicons-calculator" class="text-4xl text-gray-300 mx-auto mb-3" />
      <h2 class="text-base font-medium text-gray-900 mb-1">Todavía no se activó la contabilidad</h2>
      <p class="text-sm text-gray-500 max-w-sm mx-auto mb-5">
        Al activar, se clona el plan de cuentas oficial NIIF hacia {{ activeOrigin?.profile.name }}: queda
        listo para registrar asientos, mayorizar y llevar la contabilidad formal.
      </p>
      <UButton color="primary" :loading="activando" @click="handleActivar">Activar módulo de contabilidad</UButton>
    </div>

    <template v-else>
      <div class="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg border-b-2 transition-colors"
          :class="activeTab === tab.key
            ? 'border-brand-500 text-gray-900'
            : 'border-transparent text-gray-400 hover:text-gray-600'"
          @click="activeTab = tab.key"
        >
          <UIcon :name="tab.icon" class="text-base" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Libro mayor -->
      <div v-if="activeTab === 'mayor'">
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
        <div v-else-if="mayor.length" class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
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
      </div>

      <!-- Asientos -->
      <div v-else-if="activeTab === 'asientos'">
        <div class="flex justify-end mb-4">
          <UButton color="primary" icon="i-heroicons-plus" @click="abrirNuevoAsiento">Nuevo asiento</UButton>
        </div>

        <div v-if="loadingAsientos" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
        </div>
        <div v-else-if="!asientos.length" class="border border-gray-200 rounded-xl p-10 text-center">
          <UIcon name="i-heroicons-book-open" class="text-4xl text-gray-300 mx-auto mb-3" />
          <p class="text-sm text-gray-500">Todavía no hay asientos registrados.</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="a in asientos" :key="a.id" class="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              @click="toggleAsiento(a)"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ a.descripcion }}</p>
                <p class="text-xs text-gray-500">{{ a.fecha }} · {{ a.origen === 'manual' ? 'Manual' : 'Factura' }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span v-if="a.detalles" class="text-sm font-medium text-gray-900 tabular-nums">{{ formatMonto(totalAsiento(a)) }}</span>
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click.stop="handleDeleteAsiento(a)" />
                <UIcon name="i-heroicons-chevron-down" class="shrink-0 transition-transform" :class="expandido === a.id ? 'rotate-180' : ''" />
              </div>
            </button>

            <div v-if="expandido === a.id" class="border-t border-gray-100 px-4 py-3 bg-gray-50">
              <div v-if="cargandoDetalle && !a.detalles" class="flex justify-center py-4">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-xl text-gray-400" />
              </div>
              <table v-else class="w-full text-sm">
                <thead class="text-gray-500 text-left">
                  <tr>
                    <th class="py-1.5 font-medium">Cuenta</th>
                    <th class="py-1.5 font-medium text-right">Debe</th>
                    <th class="py-1.5 font-medium text-right">Haber</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="d in a.detalles" :key="d.id">
                    <td class="py-1.5 text-gray-700">{{ nombresCuenta[d.cuenta_id] ?? d.cuenta_id }}</td>
                    <td class="py-1.5 text-right tabular-nums">{{ d.debe > 0 ? formatMonto(d.debe) : '' }}</td>
                    <td class="py-1.5 text-right tabular-nums">{{ d.haber > 0 ? formatMonto(d.haber) : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Reportes -->
      <div v-else-if="activeTab === 'reportes'" class="space-y-10">
        <!-- Balance General -->
        <section>
          <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Balance General</h2>
              <p class="text-xs text-gray-500">Estado de Situación Financiera a una fecha de corte</p>
            </div>
            <div class="flex items-end gap-2">
              <UFormField label="Fecha de corte" name="fecha_corte">
                <UInput v-model="fechaCorte" type="date" size="sm" @change="cargarBalance" />
              </UFormField>
              <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" :loading="descargandoBalance" @click="descargarBalancePdf">
                PDF
              </UButton>
            </div>
          </div>

          <div v-if="loadingBalance" class="flex justify-center py-10">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
          </div>
          <template v-else-if="balance">
            <div
              class="rounded-lg p-3 mb-4 text-sm font-medium"
              :class="balance.cuadra ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'"
            >
              <template v-if="balance.cuadra">
                Activo = Pasivo + Patrimonio (${{ formatMonto(balance.total_activo) }})
              </template>
              <template v-else>
                Activo ({{ formatMonto(balance.total_activo) }}) ≠ Pasivo + Patrimonio ({{ formatMonto(balance.total_pasivo + balance.total_patrimonio) }})
                — diferencia de ${{ formatMonto(Math.abs(balance.diferencia)) }}.
              </template>
            </div>

            <div v-if="!lineasBalanceConMovimiento.length" class="border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
              Todavía no hay movimientos contables para mostrar.
            </div>
            <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="l in lineasBalanceConMovimiento" :key="l.codigo" class="hover:bg-gray-50">
                    <td class="px-3 py-2 font-mono text-xs text-gray-400 w-20">{{ l.codigo }}</td>
                    <td class="px-3 py-2" :style="{ paddingLeft: `${0.75 + l.nivel * 1.25}rem` }">
                      <span :class="l.es_detalle ? 'text-gray-700' : 'font-semibold text-gray-900'">{{ l.nombre }}</span>
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="l.es_detalle ? 'text-gray-700' : 'font-semibold text-gray-900'">
                      {{ formatMonto(l.valor) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <!-- Estado de Resultados -->
        <section>
          <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Estado de Resultados</h2>
              <p class="text-xs text-gray-500">Estado de Resultado Integral del período</p>
            </div>
            <div class="flex items-end gap-2">
              <UFormField label="Año" name="anio">
                <UInput v-model="anio" size="sm" class="w-20" @change="cargarResultados" />
              </UFormField>
              <UFormField label="Desde" name="mes_desde">
                <USelectMenu v-model="mesDesde" :items="mesOptions" value-key="value" size="sm" class="w-32" @update:model-value="cargarResultados" />
              </UFormField>
              <UFormField label="Hasta" name="mes_hasta">
                <USelectMenu v-model="mesHasta" :items="mesOptions" value-key="value" size="sm" class="w-32" @update:model-value="cargarResultados" />
              </UFormField>
              <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" :loading="descargandoResultados" @click="descargarResultadosPdf">
                PDF
              </UButton>
            </div>
          </div>

          <div v-if="loadingResultados" class="flex justify-center py-10">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
          </div>
          <template v-else-if="resultados">
            <div class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="l in resultados.lineas" :key="l.codigo" class="hover:bg-gray-50" :class="l.es_subtotal ? 'bg-gray-50' : ''">
                    <td class="px-3 py-2 font-mono text-xs text-gray-400 w-20">{{ l.codigo }}</td>
                    <td class="px-3 py-2" :style="{ paddingLeft: `${0.75 + l.nivel * 1.25}rem` }">
                      <span :class="l.es_subtotal ? 'font-semibold text-gray-900' : 'text-gray-700'">{{ l.nombre }}</span>
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="l.es_subtotal ? 'font-semibold text-gray-900' : 'text-gray-700'">
                      {{ formatMonto(l.valor) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <!-- Flujo de Efectivo -->
        <section>
          <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Estado de Flujos de Efectivo</h2>
              <p class="text-xs text-gray-500">Método indirecto, derivado de los cambios de saldo del período</p>
            </div>
            <div class="flex items-end gap-2">
              <UFormField label="Año" name="anio_flujo">
                <UInput v-model="anioFlujo" size="sm" class="w-20" @change="cargarFlujo" />
              </UFormField>
              <UFormField label="Desde" name="mes_desde_flujo">
                <USelectMenu v-model="mesDesdeFlujo" :items="mesOptions" value-key="value" size="sm" class="w-32" @update:model-value="cargarFlujo" />
              </UFormField>
              <UFormField label="Hasta" name="mes_hasta_flujo">
                <USelectMenu v-model="mesHastaFlujo" :items="mesOptions" value-key="value" size="sm" class="w-32" @update:model-value="cargarFlujo" />
              </UFormField>
              <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" :loading="descargandoFlujo" @click="descargarFlujoPdf">
                PDF
              </UButton>
            </div>
          </div>

          <div v-if="loadingFlujo" class="flex justify-center py-10">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
          </div>
          <template v-else-if="flujo">
            <div
              v-if="flujo.periodo_llega_hasta_hoy"
              class="rounded-lg p-3 mb-4 text-sm font-medium"
              :class="flujo.cuadra ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'"
            >
              <template v-if="flujo.cuadra">
                Efectivo inicial + movimiento neto = Efectivo actual (${{ formatMonto(flujo.efectivo_actual_real) }})
              </template>
              <template v-else>
                El efectivo calculado (${{ formatMonto(flujo.efectivo_final) }}) ≠ saldo actual de Efectivo (${{ formatMonto(flujo.efectivo_actual_real) }})
                — diferencia de ${{ formatMonto(Math.abs(flujo.diferencia)) }}.
              </template>
            </div>
            <div v-else class="rounded-lg p-3 mb-4 text-sm text-gray-600 bg-gray-50">
              El período consultado no llega hasta hoy, así que no se compara contra el saldo actual de Efectivo.
            </div>

            <div class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="l in flujo.lineas" :key="l.codigo" class="hover:bg-gray-50" :class="l.es_subtotal ? 'bg-gray-50' : ''">
                    <td class="px-3 py-2" :style="{ paddingLeft: `${0.75 + l.nivel * 1.25}rem` }">
                      <span :class="l.es_subtotal ? 'font-semibold text-gray-900' : 'text-gray-700'">{{ l.nombre }}</span>
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="l.es_subtotal ? 'font-semibold text-gray-900' : 'text-gray-700'">
                      {{ formatMonto(l.valor) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>
      </div>
    </template>

    <UModal v-model:open="showNuevoAsiento" title="Nuevo asiento contable">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">La suma del debe debe ser igual a la del haber.</p>
        <form class="space-y-4" @submit.prevent="handleCrearAsiento">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Fecha" name="fecha">
              <UInput v-model="fechaAsiento" type="date" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Descripción" name="descripcion">
              <UInput v-model="descripcionAsiento" required size="lg" class="w-full" placeholder="ej. Compra de suministros" />
            </UFormField>
          </div>

          <div class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">Cuenta</th>
                  <th class="px-3 py-2 font-medium w-32 text-right">Debe</th>
                  <th class="px-3 py-2 font-medium w-32 text-right">Haber</th>
                  <th class="w-10" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(l, i) in lineasAsiento" :key="i">
                  <td class="px-3 py-2">
                    <USelectMenu
                      v-model="l.cuenta_id" :items="cuentaOptionsActivas" value-key="value"
                      searchable placeholder="Seleccionar cuenta" size="sm" class="w-full"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <UInput v-model="l.debe" type="number" min="0" step="0.01" size="sm" class="w-full text-right" />
                  </td>
                  <td class="px-3 py-2">
                    <UInput v-model="l.haber" type="number" min="0" step="0.01" size="sm" class="w-full text-right" />
                  </td>
                  <td class="px-1 py-2 text-right">
                    <UButton v-if="lineasAsiento.length > 2" size="xs" variant="ghost" color="error" icon="i-heroicons-x-mark" @click="quitarLinea(i)" />
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td class="px-3 py-2 text-right text-xs font-medium text-gray-500">Totales</td>
                  <td class="px-3 py-2 text-right text-sm font-medium tabular-nums" :class="balanceado ? 'text-gray-900' : 'text-red-600'">
                    {{ formatMonto(totalDebe) }}
                  </td>
                  <td class="px-3 py-2 text-right text-sm font-medium tabular-nums" :class="balanceado ? 'text-gray-900' : 'text-red-600'">
                    {{ formatMonto(totalHaber) }}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <UButton variant="outline" color="neutral" icon="i-heroicons-plus" size="sm" @click="agregarLinea">
            Agregar línea
          </UButton>

          <p v-if="!balanceado" class="text-xs text-red-600">
            El asiento no está balanceado: la suma del debe debe ser igual a la del haber.
          </p>

          <UButton type="submit" color="primary" block size="lg" :loading="guardandoAsiento" :disabled="!balanceado">
            Registrar asiento
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
