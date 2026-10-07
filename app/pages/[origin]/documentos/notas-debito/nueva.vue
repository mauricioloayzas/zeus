<script setup lang="ts">
import type { Application, PuntoEmision, Cliente, NotaDebitoCreateForm } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { activeOrigin } = useZeusContext()
const { create } = useNotasDebito()
const { list: listPuntosEmision } = usePuntosEmision()
const { list: listClientes } = useClientes()
const { list: listApplications } = useApplications()
const { fetchContribuyente } = useContribuyente()
const { ensureTaxCodes, porcentajesIva, formasPago, ensure } = useCajaHelpers()

const urlName = computed(() => route.params.origin as string)
const profileId = computed(() => activeOrigin.value?.profile.id ?? '')
const loading = ref(true)
const saving = ref(false)

const APLICACION_NINGUNA = 'servicios-profesionales'

const puntosEmision = ref<PuntoEmision[]>([])
const clientes = ref<Cliente[]>([])
const applications = ref<Application[]>([])
const contribuyente = ref<{ nombre_comercial?: string | null; direccion_matriz?: string | null; regimen?: string | null; contribuyente_especial?: string | null; obligado_contabilidad?: string | null } | null>(null)

const puntoEmisionOptions = computed(() =>
  puntosEmision.value.map(p => ({ label: `${p.estab}-${p.pto_emi}${p.descripcion ? ' · ' + p.descripcion : ''}`, value: p.id }))
)
const clienteOptions = computed(() => clientes.value.map(c => ({ label: `${c.razon_social} (${c.identificacion})`, value: c.id })))
const applicationOptions = computed(() => [
  ...applications.value.map(a => ({ label: a.name, value: a.id })),
  { label: 'Servicios profesionales (sin aplicación)', value: APLICACION_NINGUNA },
])
const formaPagoOptions = computed(() => formasPago.value.map(o => ({ label: o.nombre, value: o.codigo })))
const tarifaOptions = computed(() => porcentajesIva.value.map(o => ({ label: `${o.nombre.replace('TARIFA_', '')}%`, value: o.codigo, tarifa: parseTarifa(o.nombre) })))

function parseTarifa(nombre: string): number {
  const match = nombre.match(/(\d+)$/)
  return match ? Number(match[1]) : 0
}

const TARIFA_VIGENTE = 15
function defaultCodigoPorcentaje(): string {
  const vigente = tarifaOptions.value.find(t => t.tarifa === TARIFA_VIGENTE)
  if (vigente) return vigente.value
  const masAlta = [...tarifaOptions.value].filter(t => t.tarifa > 0).sort((a, b) => b.tarifa - a.tarifa)[0]
  return masAlta?.value ?? '0'
}

const ambienteOptions = [
  { label: 'Pruebas', value: '1' },
  { label: 'Producción', value: '2' },
]

const form = reactive({
  application_id: APLICACION_NINGUNA,
  punto_emision_id: '',
  cliente_id: '',
  fecha_emision: new Date().toISOString().slice(0, 10),
  ambiente: '1',
  dir_establecimiento: '',
  num_doc_modificado: '',
  fecha_emision_doc_sustento: new Date().toISOString().slice(0, 10),
  codigo_porcentaje: '0',
  forma_pago: '01',
})

const motivos = ref<{ razon: string; valor: number }[]>([{ razon: '', valor: 0 }])

function addMotivo() {
  motivos.value.push({ razon: '', valor: 0 })
}
function removeMotivo(index: number) {
  motivos.value.splice(index, 1)
}

const puntoEmisionSeleccionado = computed(() => puntosEmision.value.find(p => p.id === form.punto_emision_id) ?? null)

const totalSinImpuestos = computed(() => motivos.value.reduce((sum, m) => sum + Number(m.valor || 0), 0))
const tarifaSeleccionada = computed(() => tarifaOptions.value.find(t => t.value === form.codigo_porcentaje)?.tarifa ?? 0)
const valorImpuesto = computed(() => totalSinImpuestos.value * (tarifaSeleccionada.value / 100))
const valorTotal = computed(() => totalSinImpuestos.value + valorImpuesto.value)

async function loadAll() {
  if (!profileId.value) return
  loading.value = true
  try {
    const [pe, cl, ap, ct] = await Promise.all([
      listPuntosEmision(profileId.value),
      listClientes(profileId.value),
      listApplications(),
      fetchContribuyente(profileId.value),
    ])
    puntosEmision.value = pe.filter(p => p.status === 'active')
    clientes.value = cl.filter(c => c.status === 'active')
    applications.value = ap
    contribuyente.value = ct
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([ensureTaxCodes(), ensure('formasPago')])
  form.codigo_porcentaje = defaultCodigoPorcentaje()
  await loadAll()
})

function toSriDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

const canSubmit = computed(() =>
  !!form.punto_emision_id && !!form.cliente_id && !!form.num_doc_modificado &&
  motivos.value.length > 0 && motivos.value.every(m => m.razon && m.valor > 0)
)

async function handleSubmit() {
  if (!profileId.value || !activeOrigin.value || !puntoEmisionSeleccionado.value) return
  const cliente = clientes.value.find(c => c.id === form.cliente_id)
  if (!cliente) return

  saving.value = true
  try {
    const payload: NotaDebitoCreateForm = {
      application_id: form.application_id,
      info_tributaria: {
        ambiente: form.ambiente as never,
        tipoEmision: '1',
        razonSocial: activeOrigin.value.profile.name,
        nombreComercial: contribuyente.value?.nombre_comercial || activeOrigin.value.profile.name,
        codDoc: '05',
        estab: puntoEmisionSeleccionado.value.estab,
        ptoEmi: puntoEmisionSeleccionado.value.pto_emi,
        dirMatriz: contribuyente.value?.direccion_matriz || '',
        regimen: contribuyente.value?.regimen || '0',
      },
      info_nota_debito: {
        fechaEmision: toSriDate(form.fecha_emision),
        dirEstablecimiento: form.dir_establecimiento,
        contribuyenteEspecial: contribuyente.value?.contribuyente_especial || null,
        obligadoContabilidad: contribuyente.value?.obligado_contabilidad || 'NO',
        tipoIdentificacionComprador: cliente.tipo_identificacion,
        razonSocialComprador: cliente.razon_social,
        identificacionComprador: cliente.identificacion,
        codDocModificado: '01',
        numDocModificado: form.num_doc_modificado,
        fechaEmisionDocSustento: toSriDate(form.fecha_emision_doc_sustento),
        totalSinImpuestos: Number(totalSinImpuestos.value.toFixed(2)),
        impuestos: [{
          codigo: '2', codigoPorcentaje: form.codigo_porcentaje as never, tarifa: tarifaSeleccionada.value,
          baseImponible: Number(totalSinImpuestos.value.toFixed(2)), valor: Number(valorImpuesto.value.toFixed(2)),
        }],
        valorTotal: Number(valorTotal.value.toFixed(2)),
        pagos: [{ formaPago: form.forma_pago as never, total: Number(valorTotal.value.toFixed(2)) }],
      },
      motivos: motivos.value.map(m => ({ razon: m.razon, valor: Number(m.valor) })),
    }

    await create(profileId.value, payload)
    toast.add({ title: 'Nota de débito creada', description: 'Se está procesando automáticamente', color: 'success' })
    router.push(`/${urlName.value}/documentos?tab=notas-debito`)
  } catch (e: unknown) {
    toast.add({ title: 'Error al crear la nota de débito', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-left" size="sm" class="mb-4" @click="router.push(`/${urlName}/documentos?tab=notas-debito`)">
      Volver a documentos electrónicos
    </UButton>

    <h1 class="text-xl font-semibold text-gray-900 mb-1">Nueva nota de débito</h1>
    <p class="text-sm text-gray-500 mb-8">Agrega un cargo adicional a una factura ya emitida por {{ activeOrigin?.profile.name }}</p>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <div v-if="!puntosEmision.length || !clientes.length" class="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        <p v-if="!puntosEmision.length">No hay ningún punto de emisión activo configurado para este perfil.</p>
        <p v-if="!clientes.length">Necesitas al menos un <NuxtLink :to="`/${urlName}/clientes`" class="underline font-medium">cliente</NuxtLink> activo.</p>
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
              <USelectMenu v-model="form.ambiente" :items="ambienteOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Fecha de emisión" name="fecha_emision">
              <UInput v-model="form.fecha_emision" type="date" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Dirección del establecimiento" name="dir_establecimiento" class="col-span-2">
              <UInput v-model="form.dir_establecimiento" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Cliente y factura modificada</h2></template>
          <div class="space-y-4">
            <UFormField label="Cliente" name="cliente_id">
              <USelectMenu v-model="form.cliente_id" :items="clienteOptions" value-key="value" placeholder="Selecciona un cliente" size="lg" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Número de factura modificada" name="num_doc_modificado" help="Ej. 001-001-000000005">
                <UInput v-model="form.num_doc_modificado" placeholder="001-001-000000005" required size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Fecha de la factura modificada" name="fecha_emision_doc_sustento">
                <UInput v-model="form.fecha_emision_doc_sustento" type="date" size="lg" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Motivos del cargo</h2>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addMotivo">Agregar motivo</UButton>
            </div>
          </template>
          <div class="space-y-3">
            <div v-for="(motivo, index) in motivos" :key="index" class="flex items-end gap-3">
              <UFormField label="Razón" name="razon" class="flex-1">
                <UInput v-model="motivo.razon" placeholder="Ej. Intereses por mora" required size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Valor" name="valor">
                <UInput v-model.number="motivo.valor" type="number" min="0" step="0.01" size="lg" class="w-40" />
              </UFormField>
              <UButton size="sm" variant="ghost" color="error" icon="i-heroicons-trash" :disabled="motivos.length === 1" @click="removeMotivo(index)" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-gray-800">Impuesto y pago</h2></template>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <UFormField label="IVA aplicable" name="codigo_porcentaje">
              <USelectMenu v-model="form.codigo_porcentaje" :items="tarifaOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Forma de pago" name="forma_pago">
              <USelectMenu v-model="form.forma_pago" :items="formaPagoOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
          </div>
          <div class="space-y-1 text-sm border-t border-gray-100 pt-4">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal sin impuestos</span>
              <span class="tabular-nums">${{ totalSinImpuestos.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>IVA {{ tarifaSeleccionada }}%</span>
              <span class="tabular-nums">${{ valorImpuesto.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100 mt-2">
              <span>Total</span>
              <span class="tabular-nums">${{ valorTotal.toFixed(2) }}</span>
            </div>
          </div>
        </UCard>

        <UButton type="submit" color="neutral" block size="lg" :loading="saving" :disabled="!canSubmit">
          Crear nota de débito
        </UButton>
      </form>
    </template>
  </div>
</template>
