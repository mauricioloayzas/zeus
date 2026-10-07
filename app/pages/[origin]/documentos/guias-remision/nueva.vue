<script setup lang="ts">
import type { Application, PuntoEmision, GuiaRemisionCreateForm } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { activeOrigin } = useZeusContext()
const { create } = useGuiasRemision()
const { list: listPuntosEmision } = usePuntosEmision()
const { list: listApplications } = useApplications()
const { fetchContribuyente } = useContribuyente()
const { tiposIdentificacion, ensure } = useCajaHelpers()

const urlName = computed(() => route.params.origin as string)
const profileId = computed(() => activeOrigin.value?.profile.id ?? '')
const loading = ref(true)
const saving = ref(false)

const APLICACION_NINGUNA = 'servicios-profesionales'

const puntosEmision = ref<PuntoEmision[]>([])
const applications = ref<Application[]>([])
const contribuyente = ref<{ nombre_comercial?: string | null; direccion_matriz?: string | null; regimen?: string | null; obligado_contabilidad?: string | null; contribuyente_especial?: string | null } | null>(null)

const puntoEmisionOptions = computed(() =>
  puntosEmision.value.map(p => ({ label: `${p.estab}-${p.pto_emi}${p.descripcion ? ' · ' + p.descripcion : ''}`, value: p.id }))
)
const applicationOptions = computed(() => [
  ...applications.value.map(a => ({ label: a.name, value: a.id })),
  { label: 'Servicios profesionales (sin aplicación)', value: APLICACION_NINGUNA },
])
const tipoIdentificacionOptions = computed(() => tiposIdentificacion.value.map(o => ({ label: o.nombre, value: o.codigo })))

const form = reactive({
  application_id: APLICACION_NINGUNA,
  punto_emision_id: '',
  ambiente: '1',
  dir_establecimiento: '',
  dir_partida: '',
  razon_social_transportista: '',
  tipo_identificacion_transportista: '04',
  ruc_transportista: '',
  placa: '',
  fecha_ini_transporte: new Date().toISOString().slice(0, 10),
  fecha_fin_transporte: new Date().toISOString().slice(0, 10),
  identificacion_destinatario: '',
  razon_social_destinatario: '',
  dir_destinatario: '',
  motivo_traslado: '',
})

interface ItemTransportado {
  codigoInterno: string
  descripcion: string
  cantidad: number
}

const items = ref<ItemTransportado[]>([{ codigoInterno: '', descripcion: '', cantidad: 1 }])

function addItem() {
  items.value.push({ codigoInterno: '', descripcion: '', cantidad: 1 })
}
function removeItem(index: number) {
  items.value.splice(index, 1)
}

const puntoEmisionSeleccionado = computed(() => puntosEmision.value.find(p => p.id === form.punto_emision_id) ?? null)

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
  await ensure('tiposIdentificacion')
  await loadAll()
})

function toSriDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

const canSubmit = computed(() =>
  !!form.punto_emision_id && !!form.identificacion_destinatario && !!form.razon_social_destinatario &&
  !!form.motivo_traslado && !!form.razon_social_transportista && !!form.ruc_transportista && !!form.placa &&
  items.value.length > 0 && items.value.every(i => i.descripcion && i.cantidad > 0)
)

async function handleSubmit() {
  if (!profileId.value || !activeOrigin.value || !puntoEmisionSeleccionado.value) return

  saving.value = true
  try {
    const payload: GuiaRemisionCreateForm = {
      application_id: form.application_id,
      info_tributaria: {
        ambiente: form.ambiente as never,
        tipoEmision: '1',
        razonSocial: activeOrigin.value.profile.name,
        nombreComercial: contribuyente.value?.nombre_comercial || activeOrigin.value.profile.name,
        codDoc: '06',
        estab: puntoEmisionSeleccionado.value.estab,
        ptoEmi: puntoEmisionSeleccionado.value.pto_emi,
        dirMatriz: contribuyente.value?.direccion_matriz || '',
        regimen: contribuyente.value?.regimen || '0',
      },
      info_guia_remision: {
        dirEstablecimiento: form.dir_establecimiento,
        dirPartida: form.dir_partida,
        razonSocialTransportista: form.razon_social_transportista,
        tipoIdentificacionTransportista: form.tipo_identificacion_transportista as never,
        rucTransportista: form.ruc_transportista,
        obligadoContabilidad: contribuyente.value?.obligado_contabilidad || 'NO',
        fechaIniTransporte: toSriDate(form.fecha_ini_transporte),
        fechaFinTransporte: toSriDate(form.fecha_fin_transporte),
        placa: form.placa,
        contribuyenteEspecial: contribuyente.value?.contribuyente_especial || null,
      },
      destinatarios: [{
        identificacionDestinatario: form.identificacion_destinatario,
        razonSocialDestinatario: form.razon_social_destinatario,
        dirDestinatario: form.dir_destinatario,
        motivoTraslado: form.motivo_traslado,
        detalles: items.value.map(i => ({ codigoInterno: i.codigoInterno || 'ITEM', descripcion: i.descripcion, cantidad: i.cantidad })),
      }],
    }

    await create(profileId.value, payload)
    toast.add({ title: 'Guía de remisión creada', description: 'Se está procesando automáticamente', color: 'success' })
    router.push(`/${urlName.value}/documentos?tab=guias-remision`)
  } catch (e: unknown) {
    toast.add({ title: 'Error al crear la guía de remisión', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-left" size="sm" class="mb-4" @click="router.push(`/${urlName}/documentos?tab=guias-remision`)">
      Volver a documentos electrónicos
    </UButton>

    <h1 class="text-xl font-semibold text-gray-900 mb-1">Nueva guía de remisión</h1>
    <p class="text-sm text-gray-500 mb-8">Documenta el traslado de mercadería de {{ activeOrigin?.profile.name }} hacia un destinatario</p>

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
            <UFormField label="Dirección del establecimiento" name="dir_establecimiento">
              <UInput v-model="form.dir_establecimiento" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Dirección de partida" name="dir_partida">
              <UInput v-model="form.dir_partida" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Placa del vehículo" name="placa">
              <UInput v-model="form.placa" placeholder="ABC-1234" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Inicio de transporte" name="fecha_ini_transporte">
              <UInput v-model="form.fecha_ini_transporte" type="date" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Fin de transporte" name="fecha_fin_transporte">
              <UInput v-model="form.fecha_fin_transporte" type="date" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Transportista</h2></template>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Razón social" name="razon_social_transportista">
              <UInput v-model="form.razon_social_transportista" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="RUC/identificación" name="ruc_transportista">
              <UInput v-model="form.ruc_transportista" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Tipo de identificación" name="tipo_identificacion_transportista">
              <USelectMenu v-model="form.tipo_identificacion_transportista" :items="tipoIdentificacionOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Destinatario</h2></template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Identificación" name="identificacion_destinatario">
                <UInput v-model="form.identificacion_destinatario" required size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Razón social" name="razon_social_destinatario">
                <UInput v-model="form.razon_social_destinatario" required size="lg" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="Dirección" name="dir_destinatario">
              <UInput v-model="form.dir_destinatario" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Motivo del traslado" name="motivo_traslado">
              <UInput v-model="form.motivo_traslado" placeholder="Ej. Venta" required size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Mercadería transportada</h2>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addItem">Agregar ítem</UButton>
            </div>
          </template>
          <div class="space-y-3">
            <div v-for="(item, index) in items" :key="index" class="p-4 rounded-lg border border-gray-200 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-500">Ítem {{ index + 1 }}</span>
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" :disabled="items.length === 1" @click="removeItem(index)" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Descripción" name="descripcion">
                  <UInput v-model="item.descripcion" required size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Cantidad" name="cantidad">
                  <UInput v-model.number="item.cantidad" type="number" min="0.01" step="0.01" size="lg" class="w-full" />
                </UFormField>
              </div>
            </div>
          </div>
        </UCard>

        <UButton type="submit" color="neutral" block size="lg" :loading="saving" :disabled="!canSubmit">
          Crear guía de remisión
        </UButton>
      </form>
    </template>
  </div>
</template>
