<script setup lang="ts">
import type { AtsResult, DocumentoZipTipo, DocumentZipResult, Formulario104Result, ReporteRetencionesResult } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin } = useZeusContext()
const { formulario104, ats, downloadZip, retenciones } = useReportes()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

/** Decodifica un contenido base64 (CSV/PDF) y dispara la descarga en el navegador. */
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

function currentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

function primerDiaMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

// --- Formulario 104 ---
const periodo104 = ref(currentPeriodo())
const loading104 = ref(false)
const resultado104 = ref<Formulario104Result | null>(null)

async function generarFormulario104() {
  if (!profileId.value || !periodo104.value) return
  loading104.value = true
  resultado104.value = null
  try {
    resultado104.value = await formulario104(profileId.value, periodo104.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading104.value = false
  }
}

// --- ATS ---
const periodoAts = ref(currentPeriodo())
const loadingAts = ref(false)
const resultadoAts = ref<AtsResult | null>(null)

async function generarAts() {
  if (!profileId.value || !periodoAts.value) return
  loadingAts.value = true
  resultadoAts.value = null
  try {
    resultadoAts.value = await ats(profileId.value, periodoAts.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingAts.value = false
  }
}

function descargarXmlAts() {
  if (!resultadoAts.value) return
  const blob = new Blob([resultadoAts.value.xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ats-${resultadoAts.value.resumen.anio}-${resultadoAts.value.resumen.mes}.xml`
  a.click()
  URL.revokeObjectURL(url)
}

// --- Descarga de comprobantes (ZIP) — el "reporte de facturas" ---
const tipoOptions: { label: string, value: DocumentoZipTipo }[] = [
  { label: 'Facturas', value: 'facturas' },
  { label: 'Notas de crédito', value: 'notas-credito' },
  { label: 'Notas de débito', value: 'notas-debito' },
  { label: 'Guías de remisión', value: 'guias-remision' },
  { label: 'Retenciones', value: 'retenciones' },
  { label: 'Liquidaciones de compra', value: 'liquidaciones-compra' },
]

const desdeZip = ref(primerDiaMes())
const hastaZip = ref(hoy())
const tiposZip = ref<DocumentoZipTipo[]>([])
const loadingZip = ref(false)
const resultadoZip = ref<DocumentZipResult | null>(null)

function toggleTipo(tipo: DocumentoZipTipo, checked: boolean) {
  if (checked) {
    if (!tiposZip.value.includes(tipo)) tiposZip.value.push(tipo)
  } else {
    tiposZip.value = tiposZip.value.filter((t) => t !== tipo)
  }
}

async function generarZip() {
  if (!profileId.value || !desdeZip.value || !hastaZip.value) return
  loadingZip.value = true
  resultadoZip.value = null
  try {
    const res = await downloadZip(profileId.value, desdeZip.value, hastaZip.value, tiposZip.value)
    if (!res.total_documentos) {
      toast.add({ title: 'Sin documentos', description: 'No hay comprobantes en ese rango de fechas.', color: 'warning' })
      return
    }
    // No usamos window.open acá: al llegar después de un await, el navegador lo bloquea
    // como popup no solicitado. Mostramos el link en la página en su lugar.
    resultadoZip.value = res
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingZip.value = false
  }
}

// --- Reporte de retenciones ---
const desdeRet = ref(primerDiaMes())
const hastaRet = ref(hoy())
const loadingRetCsv = ref(false)
const loadingRetPdf = ref(false)
const resultadoRet = ref<ReporteRetencionesResult | null>(null)

async function generarReporteRetenciones(formato: 'csv' | 'pdf') {
  if (!profileId.value || !desdeRet.value || !hastaRet.value) return
  const loadingRef = formato === 'csv' ? loadingRetCsv : loadingRetPdf
  loadingRef.value = true
  try {
    const res = await retenciones(profileId.value, desdeRet.value, hastaRet.value, formato)
    resultadoRet.value = res
    descargarBase64(res.contenido_base64, res.mime_type, res.filename)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loadingRef.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4 space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-gray-900">Reportes</h1>
      <p class="text-sm text-gray-500">ATS, Formulario 104 y descarga de comprobantes de {{ activeOrigin?.profile.name }}</p>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-800">Formulario 104 (IVA mensual)</h2>
      </template>

      <div class="flex items-end gap-3 mb-4">
        <UFormField label="Período" name="periodo104" class="flex-1 max-w-[180px]">
          <UInput v-model="periodo104" type="month" size="lg" class="w-full" />
        </UFormField>
        <UButton color="primary" size="lg" :loading="loading104" @click="generarFormulario104">
          Generar
        </UButton>
      </div>
      <p class="text-xs text-gray-400 -mt-2 mb-4">
        Al generarlo se envía también por correo (con un PDF de apoyo adjunto) y WhatsApp si está conectado.
      </p>

      <div v-if="resultado104" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="border border-gray-200 rounded-lg p-4">
            <p class="text-xs font-medium text-gray-500 mb-2">Ventas</p>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Gravadas tarifa &gt; 0%</span><span class="tabular-nums">{{ money(resultado104.ventas.gravadas_tarifa_diferente_0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Tarifa 0%</span><span class="tabular-nums">{{ money(resultado104.ventas.tarifa_0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Exentas / no objeto</span><span class="tabular-nums">{{ money(resultado104.ventas.exentas_no_objeto) }}</span></div>
              <div class="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100"><span>IVA generado</span><span class="tabular-nums">{{ money(resultado104.ventas.iva_generado) }}</span></div>
            </div>
          </div>
          <div class="border border-gray-200 rounded-lg p-4">
            <p class="text-xs font-medium text-gray-500 mb-2">Compras</p>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Gravadas con crédito tributario</span><span class="tabular-nums">{{ money(resultado104.compras.gravadas_con_derecho_credito_tributario) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Tarifa 0%</span><span class="tabular-nums">{{ money(resultado104.compras.tarifa_0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Exentas / no objeto</span><span class="tabular-nums">{{ money(resultado104.compras.exentas_no_objeto) }}</span></div>
              <div class="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100"><span>IVA crédito tributario</span><span class="tabular-nums">{{ money(resultado104.compras.iva_credito_tributario) }}</span></div>
            </div>
          </div>
        </div>

        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">IVA causado</span>
            <span class="font-medium text-gray-900 tabular-nums">{{ money(resultado104.liquidacion.iva_causado) }}</span>
          </div>
          <div class="flex justify-between text-sm mt-1">
            <span class="text-gray-600">Crédito tributario a favor</span>
            <span class="font-medium text-gray-900 tabular-nums">{{ money(resultado104.liquidacion.credito_tributario_favor) }}</span>
          </div>
        </div>

        <ul class="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 space-y-1">
          <li v-for="(a, i) in resultado104.advertencias" :key="i">⚠️ {{ a }}</li>
        </ul>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-800">ATS (Anexo Transaccional Simplificado)</h2>
      </template>

      <div class="flex items-end gap-3 mb-4">
        <UFormField label="Período" name="periodoAts" class="flex-1 max-w-[180px]">
          <UInput v-model="periodoAts" type="month" size="lg" class="w-full" />
        </UFormField>
        <UButton color="primary" size="lg" :loading="loadingAts" @click="generarAts">
          Generar
        </UButton>
      </div>
      <p class="text-xs text-gray-400 -mt-2 mb-4">
        Al generarlo se envía también por correo (con el XML adjunto) y WhatsApp si está conectado.
      </p>

      <div v-if="resultadoAts" class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div class="border border-gray-200 rounded-lg p-3">
            <p class="text-xs text-gray-500">Ventas</p>
            <p class="font-medium text-gray-900">{{ resultadoAts.resumen.total_ventas }}</p>
          </div>
          <div class="border border-gray-200 rounded-lg p-3">
            <p class="text-xs text-gray-500">Compras</p>
            <p class="font-medium text-gray-900">{{ resultadoAts.resumen.total_compras }}</p>
          </div>
          <div class="border border-gray-200 rounded-lg p-3">
            <p class="text-xs text-gray-500">IVA ventas</p>
            <p class="font-medium text-gray-900 tabular-nums">{{ money(resultadoAts.resumen.total_iva_ventas) }}</p>
          </div>
          <div class="border border-gray-200 rounded-lg p-3">
            <p class="text-xs text-gray-500">IVA compras</p>
            <p class="font-medium text-gray-900 tabular-nums">{{ money(resultadoAts.resumen.total_iva_compras) }}</p>
          </div>
        </div>

        <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" @click="descargarXmlAts">
          Descargar XML
        </UButton>

        <ul class="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 space-y-1">
          <li v-for="(a, i) in resultadoAts.advertencias" :key="i">⚠️ {{ a }}</li>
        </ul>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-800">Reporte de facturas y comprobantes (ZIP)</h2>
      </template>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <UFormField label="Desde" name="desdeZip">
          <UInput v-model="desdeZip" type="date" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Hasta" name="hastaZip">
          <UInput v-model="hastaZip" type="date" size="lg" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Tipos de documento (vacío = todos)" name="tiposZip" class="mb-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <UCheckbox
            v-for="t in tipoOptions"
            :key="t.value"
            :model-value="tiposZip.includes(t.value)"
            :label="t.label"
            @update:model-value="(v) => toggleTipo(t.value, !!v)"
          />
        </div>
      </UFormField>

      <UButton color="primary" size="lg" icon="i-heroicons-archive-box-arrow-down" :loading="loadingZip" @click="generarZip">
        Generar ZIP
      </UButton>

      <div v-if="resultadoZip" class="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-between gap-3">
        <div class="text-sm">
          <p class="font-medium text-gray-900">ZIP listo ({{ resultadoZip.total_documentos }} documentos)</p>
          <p class="text-gray-500">El link expira en {{ resultadoZip.expira_en_minutos }} minutos.</p>
        </div>
        <UButton :href="resultadoZip.url" target="_blank" color="neutral" icon="i-heroicons-arrow-down-tray">
          Descargar
        </UButton>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-800">Reporte de retenciones</h2>
      </template>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <UFormField label="Desde" name="desdeRet">
          <UInput v-model="desdeRet" type="date" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Hasta" name="hastaRet">
          <UInput v-model="hastaRet" type="date" size="lg" class="w-full" />
        </UFormField>
      </div>

      <div class="flex gap-3 mb-4">
        <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" :loading="loadingRetCsv" @click="generarReporteRetenciones('csv')">
          Descargar CSV
        </UButton>
        <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-down-tray" :loading="loadingRetPdf" @click="generarReporteRetenciones('pdf')">
          Descargar PDF
        </UButton>
      </div>

      <div v-if="resultadoRet" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div class="border border-gray-200 rounded-lg p-3">
          <p class="text-xs text-gray-500">Comprobantes</p>
          <p class="font-medium text-gray-900">{{ resultadoRet.resumen.total_comprobantes }}</p>
        </div>
        <div class="border border-gray-200 rounded-lg p-3">
          <p class="text-xs text-gray-500">Total retenido</p>
          <p class="font-medium text-gray-900 tabular-nums">{{ money(resultadoRet.resumen.total_retenido) }}</p>
        </div>
        <div class="border border-gray-200 rounded-lg p-3">
          <p class="text-xs text-gray-500">Renta</p>
          <p class="font-medium text-gray-900 tabular-nums">{{ money(resultadoRet.resumen.total_renta) }}</p>
        </div>
        <div class="border border-gray-200 rounded-lg p-3">
          <p class="text-xs text-gray-500">IVA</p>
          <p class="font-medium text-gray-900 tabular-nums">{{ money(resultadoRet.resumen.total_iva) }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
