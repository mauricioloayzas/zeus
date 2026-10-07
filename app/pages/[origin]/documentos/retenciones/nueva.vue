<script setup lang="ts">
import type { Application, PuntoEmision, ImpuestoRetencion, RetencionCreateForm } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { activeOrigin } = useZeusContext()
const { create } = useRetenciones()
const { list: listPuntosEmision } = usePuntosEmision()
const { list: listApplications } = useApplications()
const { fetchContribuyente } = useContribuyente()
const { tiposIdentificacion, codigosImpuesto, ensure, ensureTaxCodes } = useCajaHelpers()

const urlName = computed(() => route.params.origin as string)
const profileId = computed(() => activeOrigin.value?.profile.id ?? '')
const loading = ref(true)
const saving = ref(false)

const APLICACION_NINGUNA = 'servicios-profesionales'

const puntosEmision = ref<PuntoEmision[]>([])
const applications = ref<Application[]>([])
const contribuyente = ref<{ nombre_comercial?: string | null; direccion_matriz?: string | null; regimen?: string | null; obligado_contabilidad?: string | null } | null>(null)

const puntoEmisionOptions = computed(() =>
  puntosEmision.value.map(p => ({ label: `${p.estab}-${p.pto_emi}${p.descripcion ? ' · ' + p.descripcion : ''}`, value: p.id }))
)
const applicationOptions = computed(() => [
  ...applications.value.map(a => ({ label: a.name, value: a.id })),
  { label: 'Servicios profesionales (sin aplicación)', value: APLICACION_NINGUNA },
])
const tipoIdentificacionOptions = computed(() => tiposIdentificacion.value.map(o => ({ label: o.nombre, value: o.codigo })))
const IMPUESTO_LABELS: Record<string, string> = { '1': 'Renta', '2': 'IVA', '3': 'ICE', '5': 'IRBPNR' }
const codigoImpuestoOptions = computed(() => codigosImpuesto.value.map(o => ({ label: IMPUESTO_LABELS[o.codigo] ?? o.nombre, value: o.codigo })))

const form = reactive({
  application_id: APLICACION_NINGUNA,
  punto_emision_id: '',
  ambiente: '1',
  dir_establecimiento: '',
  fecha_emision: new Date().toISOString().slice(0, 10),
  periodo_fiscal: new Date().toISOString().slice(0, 7).split('-').reverse().join('/'),
  tipo_identificacion_sujeto_retenido: '04',
  razon_social_sujeto_retenido: '',
  identificacion_sujeto_retenido: '',
})

interface LineaRetencion {
  codigo_impuesto: string
  codigo_retencion: string
  descripcion: string
  base_imponible: number
  porcentaje_retener: number
  num_doc_sustento: string
  fecha_emision_doc_sustento: string
}

const lineas = ref<LineaRetencion[]>([{
  codigo_impuesto: '1', codigo_retencion: '', descripcion: '', base_imponible: 0, porcentaje_retener: 0,
  num_doc_sustento: '', fecha_emision_doc_sustento: new Date().toISOString().slice(0, 10),
}])

function addLinea() {
  lineas.value.push({
    codigo_impuesto: '1', codigo_retencion: '', descripcion: '', base_imponible: 0, porcentaje_retener: 0,
    num_doc_sustento: '', fecha_emision_doc_sustento: new Date().toISOString().slice(0, 10),
  })
}
function removeLinea(index: number) {
  lineas.value.splice(index, 1)
}
function valorRetenido(linea: LineaRetencion) {
  return linea.base_imponible * (linea.porcentaje_retener / 100)
}

const puntoEmisionSeleccionado = computed(() => puntosEmision.value.find(p => p.id === form.punto_emision_id) ?? null)
const totalRetenido = computed(() => lineas.value.reduce((sum, l) => sum + valorRetenido(l), 0))

async function loadAll() {
  if (!profileId.value) return
  loading.value = true
  try {
    const [pe, ap, ct] = await Promise.all([
      listPuntosEmision(profileId.value),
      listApplications(),
      fetchContribuyente(profileId.value),
    ])
    puntosEmision.value = pe.filter(p => p.status === 'active')
    applications.value = ap
    contribuyente.value = ct
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([ensure('tiposIdentificacion'), ensureTaxCodes()])
  await loadAll()
})

function toSriDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

const canSubmit = computed(() =>
  !!form.punto_emision_id && !!form.razon_social_sujeto_retenido && !!form.identificacion_sujeto_retenido &&
  lineas.value.length > 0 && lineas.value.every(l => l.codigo_retencion && l.base_imponible > 0 && l.num_doc_sustento)
)

async function handleSubmit() {
  if (!profileId.value || !activeOrigin.value || !puntoEmisionSeleccionado.value) return

  saving.value = true
  try {
    const impuestos: ImpuestoRetencion[] = lineas.value.map(l => ({
      codigo: l.codigo_impuesto as never,
      codigoRetencion: l.codigo_retencion,
      baseImponible: Number(l.base_imponible.toFixed(2)),
      porcentajeRetener: Number(l.porcentaje_retener),
      valorRetenido: Number(valorRetenido(l).toFixed(2)),
      codDocSustento: '01',
      numDocSustento: l.num_doc_sustento,
      fechaEmisionDocSustento: toSriDate(l.fecha_emision_doc_sustento),
      descripcion: l.descripcion || undefined,
    }))

    const payload: RetencionCreateForm = {
      application_id: form.application_id,
      info_tributaria: {
        ambiente: form.ambiente as never,
        tipoEmision: '1',
        razonSocial: activeOrigin.value.profile.name,
        nombreComercial: contribuyente.value?.nombre_comercial || activeOrigin.value.profile.name,
        codDoc: '07',
        estab: puntoEmisionSeleccionado.value.estab,
        ptoEmi: puntoEmisionSeleccionado.value.pto_emi,
        dirMatriz: contribuyente.value?.direccion_matriz || '',
        regimen: contribuyente.value?.regimen || '0',
      },
      info_comp_retencion: {
        fechaEmision: toSriDate(form.fecha_emision),
        dirEstablecimiento: form.dir_establecimiento,
        obligadoContabilidad: contribuyente.value?.obligado_contabilidad || 'NO',
        tipoIdentificacionSujetoRetenido: form.tipo_identificacion_sujeto_retenido as never,
        razonSocialSujetoRetenido: form.razon_social_sujeto_retenido,
        identificacionSujetoRetenido: form.identificacion_sujeto_retenido,
        periodoFiscal: form.periodo_fiscal,
      },
      impuestos,
    }

    await create(profileId.value, payload)
    toast.add({ title: 'Retención creada', description: 'Se está procesando automáticamente', color: 'success' })
    router.push(`/${urlName.value}/documentos?tab=retenciones`)
  } catch (e: unknown) {
    toast.add({ title: 'Error al crear la retención', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-left" size="sm" class="mb-4" @click="router.push(`/${urlName}/documentos?tab=retenciones`)">
      Volver a documentos electrónicos
    </UButton>

    <h1 class="text-xl font-semibold text-gray-900 mb-1">Nueva retención</h1>
    <p class="text-sm text-gray-500 mb-8">Documenta los valores que {{ activeOrigin?.profile.name }} retuvo a un proveedor</p>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <div v-if="!puntosEmision.length" class="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        No hay ningún punto de emisión activo configurado para este perfil.
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Datos del comprobante</h2></template>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Aplicación" name="application_id">
              <USelectMenu v-model="form.application_id" :items="applicationOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Punto de emisión" name="punto_emision_id">
              <USelectMenu v-model="form.punto_emision_id" :items="puntoEmisionOptions" value-key="value" placeholder="Selecciona un punto de emisión" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Ambiente" name="ambiente">
              <USelectMenu v-model="form.ambiente" :items="[{ label: 'Pruebas', value: '1' }, { label: 'Producción', value: '2' }]" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Fecha de emisión" name="fecha_emision">
              <UInput v-model="form.fecha_emision" type="date" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Período fiscal" name="periodo_fiscal" help="MM/AAAA">
              <UInput v-model="form.periodo_fiscal" placeholder="07/2026" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Dirección del establecimiento" name="dir_establecimiento">
              <UInput v-model="form.dir_establecimiento" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Sujeto retenido (proveedor)</h2></template>
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Tipo de identificación" name="tipo_identificacion_sujeto_retenido">
              <USelectMenu v-model="form.tipo_identificacion_sujeto_retenido" :items="tipoIdentificacionOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Identificación" name="identificacion_sujeto_retenido">
              <UInput v-model="form.identificacion_sujeto_retenido" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Razón social" name="razon_social_sujeto_retenido">
              <UInput v-model="form.razon_social_sujeto_retenido" required size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Valores retenidos</h2>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addLinea">Agregar retención</UButton>
            </div>
          </template>
          <div class="space-y-4">
            <div v-for="(linea, index) in lineas" :key="index" class="p-4 rounded-lg border border-gray-200 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-500">Retención {{ index + 1 }}</span>
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" :disabled="lineas.length === 1" @click="removeLinea(index)" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Comprobante sustento (factura del proveedor)" name="num_doc_sustento">
                  <UInput v-model="linea.num_doc_sustento" placeholder="001-001-000000005" required size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Fecha del comprobante" name="fecha_emision_doc_sustento">
                  <UInput v-model="linea.fecha_emision_doc_sustento" type="date" size="lg" class="w-full" />
                </UFormField>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Tipo de impuesto" name="codigo_impuesto" help="Renta: honorarios, servicios, arrendamientos. IVA: retención de IVA a proveedores.">
                  <USelectMenu v-model="linea.codigo_impuesto" :items="codigoImpuestoOptions" value-key="value" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Código de retención" name="codigo_retencion" help="SRI, ej. 303, 312">
                  <UInput v-model="linea.codigo_retencion" placeholder="303" required size="lg" class="w-full" />
                </UFormField>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Base imponible" name="base_imponible">
                  <UInput v-model.number="linea.base_imponible" type="number" min="0" step="0.01" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="% a retener" name="porcentaje_retener">
                  <UInput v-model.number="linea.porcentaje_retener" type="number" min="0" step="0.01" size="lg" class="w-full" />
                </UFormField>
              </div>
              <p class="text-sm text-gray-500 text-right">
                Valor retenido: <span class="font-medium text-gray-900 tabular-nums">${{ valorRetenido(linea).toFixed(2) }}</span>
              </p>
            </div>
          </div>
        </UCard>

        <div class="p-4 rounded-xl border border-gray-200 flex justify-between text-base font-semibold text-gray-900">
          <span>Total retenido</span>
          <span class="tabular-nums">${{ totalRetenido.toFixed(2) }}</span>
        </div>

        <UButton type="submit" color="neutral" block size="lg" :loading="saving" :disabled="!canSubmit">
          Crear retención
        </UButton>
      </form>
    </template>
  </div>
</template>
