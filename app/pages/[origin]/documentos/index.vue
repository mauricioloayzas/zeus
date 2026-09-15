<script setup lang="ts">
import type { Factura, Proforma, NotaCredito, NotaDebito, GuiaRemision, ComprobanteRetencion, LiquidacionCompra } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin, applicationName } = useZeusContext()
const { list: listFacturas } = useFacturas()
const { list: listProformas } = useProformas()
const { list: listNotasCredito } = useNotasCredito()
const { list: listNotasDebito } = useNotasDebito()
const { list: listGuiasRemision } = useGuiasRemision()
const { list: listRetenciones } = useRetenciones()
const { list: listLiquidacionesCompra } = useLiquidacionesCompra()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

type TabKey = 'facturas' | 'proformas' | 'notas-credito' | 'notas-debito' | 'guias-remision' | 'retenciones' | 'liquidaciones-compra'

const tabs: { key: TabKey, label: string, icon: string }[] = [
  { key: 'facturas', label: 'Facturas', icon: 'i-heroicons-document-text' },
  { key: 'proformas', label: 'Proformas', icon: 'i-heroicons-document-duplicate' },
  { key: 'notas-credito', label: 'Notas de crédito', icon: 'i-heroicons-arrow-uturn-left' },
  { key: 'notas-debito', label: 'Notas de débito', icon: 'i-heroicons-arrow-uturn-right' },
  { key: 'guias-remision', label: 'Guías de remisión', icon: 'i-heroicons-truck' },
  { key: 'retenciones', label: 'Retenciones', icon: 'i-heroicons-receipt-percent' },
  { key: 'liquidaciones-compra', label: 'Liquidaciones de compra', icon: 'i-heroicons-shopping-cart' },
]

const activeTab = ref<TabKey>('facturas')
const loading = ref(true)

const facturas = ref<Factura[]>([])
const proformas = ref<Proforma[]>([])
const notasCredito = ref<NotaCredito[]>([])
const notasDebito = ref<NotaDebito[]>([])
const guiasRemision = ref<GuiaRemision[]>([])
const retenciones = ref<ComprobanteRetencion[]>([])
const liquidacionesCompra = ref<LiquidacionCompra[]>([])

const loaded = new Set<TabKey>()

async function loadTab(tab: TabKey) {
  if (!profileId.value) return
  loading.value = true
  try {
    switch (tab) {
      case 'facturas':
        facturas.value = (await listFacturas(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'proformas':
        proformas.value = (await listProformas(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'notas-credito':
        notasCredito.value = (await listNotasCredito(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'notas-debito':
        notasDebito.value = (await listNotasDebito(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'guias-remision':
        guiasRemision.value = (await listGuiasRemision(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'retenciones':
        retenciones.value = (await listRetenciones(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'liquidaciones-compra':
        liquidacionesCompra.value = (await listLiquidacionesCompra(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
    }
    loaded.add(tab)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  loaded.clear()
  loadTab(activeTab.value)
}

onMounted(() => loadTab(activeTab.value))
watch(profileId, resetAndLoad)
watch(activeTab, (tab) => {
  if (!loaded.has(tab)) loadTab(tab)
})

function estadoColor(estado: string) {
  if (estado === 'autorizado') return 'success'
  if (estado === 'rechazado' || estado === 'anulado') return 'error'
  return 'neutral'
}

function secuencial(info: { estab: string, ptoEmi: string, secuencial?: string }) {
  return `${info.estab}-${info.ptoEmi}-${info.secuencial ?? '—'}`
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Documentos electrónicos</h1>
      <p class="text-sm text-gray-500">Comprobantes emitidos por {{ activeOrigin?.profile.name }}</p>
    </div>

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

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <!-- Facturas -->
      <div v-if="activeTab === 'facturas'">
        <div v-if="!facturas.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-document-text" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ninguna factura</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Comprador</th>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Total</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Origen</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="f in facturas" :key="f.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(f.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ f.info_factura.razonSocialComprador }}</td>
                <td class="px-4 py-3 text-gray-500">{{ f.info_factura.fechaEmision }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ f.info_factura.importeTotal.toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(f.application_id) }}</td>
                <td class="px-4 py-3 text-gray-400 text-xs">
                  {{ f.info_adicional?.subscription_id ? 'Suscripción' : (f.info_adicional?.cita_id ? 'Cita' : '—') }}
                </td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(f.estado)" variant="subtle">{{ f.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Proformas -->
      <div v-else-if="activeTab === 'proformas'">
        <div v-if="!proformas.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-document-duplicate" class="text-5xl mb-3" />
          <p>Todavía no se ha generado ninguna proforma</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Número</th>
                <th class="px-4 py-3 font-medium">Cliente</th>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Total</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in proformas" :key="p.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ p.numero }}</td>
                <td class="px-4 py-3 text-gray-500">{{ p.razon_social }}</td>
                <td class="px-4 py-3 text-gray-500">{{ p.fecha_emision }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ p.importeTotal.toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(p.application_id) }}</td>
                <td class="px-4 py-3">
                  <UBadge :color="p.estado === 'anulada' ? 'error' : (p.estado === 'convertida' ? 'success' : 'neutral')" variant="subtle">{{ p.estado }}</UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Notas de crédito -->
      <div v-else-if="activeTab === 'notas-credito'">
        <div v-if="!notasCredito.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-arrow-uturn-left" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ninguna nota de crédito</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Comprador</th>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Valor</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="n in notasCredito" :key="n.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(n.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ n.info_nota_credito.razonSocialComprador }}</td>
                <td class="px-4 py-3 text-gray-500">{{ n.info_nota_credito.fechaEmision }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ n.info_nota_credito.valorModificacion.toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(n.application_id) }}</td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(n.estado)" variant="subtle">{{ n.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Notas de débito -->
      <div v-else-if="activeTab === 'notas-debito'">
        <div v-if="!notasDebito.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-arrow-uturn-right" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ninguna nota de débito</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Comprador</th>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Valor</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="n in notasDebito" :key="n.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(n.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ n.info_nota_debito.razonSocialComprador }}</td>
                <td class="px-4 py-3 text-gray-500">{{ n.info_nota_debito.fechaEmision }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ n.info_nota_debito.valorTotal.toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(n.application_id) }}</td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(n.estado)" variant="subtle">{{ n.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Guías de remisión -->
      <div v-else-if="activeTab === 'guias-remision'">
        <div v-if="!guiasRemision.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-truck" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ninguna guía de remisión</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Destinatario(s)</th>
                <th class="px-4 py-3 font-medium">Inicio transporte</th>
                <th class="px-4 py-3 font-medium">Placa</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="g in guiasRemision" :key="g.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(g.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">
                  {{ g.destinatarios[0]?.razonSocialDestinatario ?? '—' }}
                  <span v-if="g.destinatarios.length > 1" class="text-gray-400"> +{{ g.destinatarios.length - 1 }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ g.info_guia_remision.fechaIniTransporte }}</td>
                <td class="px-4 py-3 text-gray-500">{{ g.info_guia_remision.placa }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(g.application_id) }}</td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(g.estado)" variant="subtle">{{ g.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Retenciones -->
      <div v-else-if="activeTab === 'retenciones'">
        <div v-if="!retenciones.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-receipt-percent" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ningún comprobante de retención</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Sujeto retenido</th>
                <th class="px-4 py-3 font-medium">Periodo fiscal</th>
                <th class="px-4 py-3 font-medium">Total retenido</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="r in retenciones" :key="r.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(r.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ r.info_comp_retencion.razonSocialSujetoRetenido }}</td>
                <td class="px-4 py-3 text-gray-500">{{ r.info_comp_retencion.periodoFiscal }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ r.impuestos.reduce((s, i) => s + i.valorRetenido, 0).toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(r.application_id) }}</td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(r.estado)" variant="subtle">{{ r.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Liquidaciones de compra -->
      <div v-else-if="activeTab === 'liquidaciones-compra'">
        <div v-if="!liquidacionesCompra.length" class="text-center py-16 text-gray-400 border border-gray-200 rounded-xl">
          <UIcon name="i-heroicons-shopping-cart" class="text-5xl mb-3" />
          <p>Todavía no se ha emitido ninguna liquidación de compra</p>
        </div>
        <div v-else class="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Secuencial</th>
                <th class="px-4 py-3 font-medium">Proveedor</th>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Total</th>
                <th class="px-4 py-3 font-medium">Aplicación</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="l in liquidacionesCompra" :key="l.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ secuencial(l.info_tributaria) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ l.info_liquidacion_compra.razonSocialProveedor }}</td>
                <td class="px-4 py-3 text-gray-500">{{ l.info_liquidacion_compra.fechaEmision }}</td>
                <td class="px-4 py-3 text-gray-500 tabular-nums">${{ l.info_liquidacion_compra.importeTotal.toFixed(2) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ applicationName(l.application_id) }}</td>
                <td class="px-4 py-3"><UBadge :color="estadoColor(l.estado)" variant="subtle">{{ l.estado }}</UBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
