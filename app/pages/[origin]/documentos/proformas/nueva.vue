<script setup lang="ts">
import type { Application, Cliente, DetalleFactura, ImpuestoDetalle, ProformaCreateForm } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { activeOrigin } = useZeusContext()
const { create } = useProformas()
const { list: listClientes } = useClientes()
const { list: listApplications } = useApplications()
const { ensureTaxCodes, porcentajesIva } = useCajaHelpers()

const urlName = computed(() => route.params.origin as string)
const profileId = computed(() => activeOrigin.value?.profile.id ?? '')
const loading = ref(true)
const saving = ref(false)

const APLICACION_NINGUNA = 'servicios-profesionales'

const clientes = ref<Cliente[]>([])
const applications = ref<Application[]>([])

const clienteOptions = computed(() => clientes.value.map(c => ({ label: `${c.razon_social} (${c.identificacion})`, value: c.id })))
const applicationOptions = computed(() => [
  ...applications.value.map(a => ({ label: a.name, value: a.id })),
  { label: 'Servicios profesionales (sin aplicación)', value: APLICACION_NINGUNA },
])
const tarifaOptions = computed(() => porcentajesIva.value.map(o => ({ label: `${o.nombre.replace('TARIFA_', '')}%`, value: o.codigo, tarifa: parseTarifa(o.nombre) })))

function parseTarifa(nombre: string): number {
  const match = nombre.match(/(\d+)$/)
  return match ? Number(match[1]) : 0
}

function fechaMasDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

const form = reactive({
  application_id: APLICACION_NINGUNA,
  cliente_id: '',
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_expiracion: fechaMasDias(15),
  notas: '',
})

interface LineaDetalle {
  codigoPrincipal: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  codigoPorcentaje: string
}

const lineas = ref<LineaDetalle[]>([])

const TARIFA_VIGENTE = 15

function defaultCodigoPorcentaje(): string {
  const vigente = tarifaOptions.value.find(t => t.tarifa === TARIFA_VIGENTE)
  if (vigente) return vigente.value
  const masAlta = [...tarifaOptions.value].filter(t => t.tarifa > 0).sort((a, b) => b.tarifa - a.tarifa)[0]
  return masAlta?.value ?? '0'
}

function addLinea() {
  lineas.value.push({
    codigoPrincipal: '',
    descripcion: '',
    cantidad: 1,
    precioUnitario: 0,
    descuento: 0,
    codigoPorcentaje: defaultCodigoPorcentaje(),
  })
}

function removeLinea(index: number) {
  lineas.value.splice(index, 1)
}

function lineaTarifa(linea: LineaDetalle): number {
  return tarifaOptions.value.find(t => t.value === linea.codigoPorcentaje)?.tarifa ?? 0
}

function lineaSubtotal(linea: LineaDetalle): number {
  return Math.max(0, linea.cantidad * linea.precioUnitario - linea.descuento)
}

function lineaImpuesto(linea: LineaDetalle): number {
  return lineaSubtotal(linea) * (lineaTarifa(linea) / 100)
}

const totalSinImpuestos = computed(() => lineas.value.reduce((sum, l) => sum + lineaSubtotal(l), 0))
const totalDescuento = computed(() => lineas.value.reduce((sum, l) => sum + Number(l.descuento || 0), 0))

const impuestosAgrupados = computed(() => {
  const grupos = new Map<string, { codigoPorcentaje: string; tarifa: number; baseImponible: number; valor: number }>()
  for (const linea of lineas.value) {
    const key = linea.codigoPorcentaje
    const tarifa = lineaTarifa(linea)
    const base = lineaSubtotal(linea)
    const valor = lineaImpuesto(linea)
    const existing = grupos.get(key)
    if (existing) {
      existing.baseImponible += base
      existing.valor += valor
    } else {
      grupos.set(key, { codigoPorcentaje: key, tarifa, baseImponible: base, valor })
    }
  }
  return [...grupos.values()]
})

const totalImpuestos = computed(() => impuestosAgrupados.value.reduce((sum, i) => sum + i.valor, 0))
const importeTotal = computed(() => totalSinImpuestos.value + totalImpuestos.value)

async function loadAll() {
  if (!profileId.value) return
  loading.value = true
  try {
    const [cl, ap] = await Promise.all([
      listClientes(profileId.value),
      listApplications(),
    ])
    clientes.value = cl.filter(c => c.status === 'active')
    applications.value = ap
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureTaxCodes()
  await loadAll()
  if (!lineas.value.length) addLinea()
})

const canSubmit = computed(() =>
  !!form.cliente_id && lineas.value.length > 0 &&
  lineas.value.every(l => l.descripcion && l.cantidad > 0)
)

async function handleSubmit() {
  if (!profileId.value) return

  const cliente = clientes.value.find(c => c.id === form.cliente_id)
  if (!cliente) return

  saving.value = true
  try {
    const detalle: DetalleFactura[] = lineas.value.map((l) => {
      const impuesto: ImpuestoDetalle = {
        codigo: '2',
        codigoPorcentaje: l.codigoPorcentaje as never,
        tarifa: lineaTarifa(l),
        baseImponible: Number(lineaSubtotal(l).toFixed(2)),
        valor: Number(lineaImpuesto(l).toFixed(2)),
      }
      return {
        codigoPrincipal: l.codigoPrincipal || 'SERV',
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        descuento: Number(l.descuento || 0),
        precioTotalSinImpuesto: Number(lineaSubtotal(l).toFixed(2)),
        impuesto,
      }
    })

    const payload: ProformaCreateForm = {
      application_id: form.application_id,
      fecha_emision: form.fecha_emision,
      fecha_expiracion: form.fecha_expiracion || null,
      tipo_identificacion: cliente.tipo_identificacion,
      identificacion: cliente.identificacion,
      razon_social: cliente.razon_social,
      email: cliente.email || null,
      telefono: cliente.telefono || null,
      cliente_id: cliente.id,
      detalle,
      totalSinImpuestos: Number(totalSinImpuestos.value.toFixed(2)),
      totalDescuento: Number(totalDescuento.value.toFixed(2)),
      totalImpuesto: impuestosAgrupados.value.map(i => ({
        codigo: '2',
        codigoPorcentaje: i.codigoPorcentaje as never,
        tarifa: i.tarifa,
        baseImponible: Number(i.baseImponible.toFixed(2)),
        valor: Number(i.valor.toFixed(2)),
      })),
      importeTotal: Number(importeTotal.value.toFixed(2)),
      notas: form.notas || null,
    }

    const proforma = await create(profileId.value, payload)
    toast.add({ title: 'Proforma creada', description: `Número ${proforma.numero}`, color: 'success' })
    router.push(`/${urlName.value}/documentos?tab=proformas`)
  } catch (e: unknown) {
    toast.add({ title: 'Error al crear la proforma', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-left" size="sm" class="mb-4" @click="router.push(`/${urlName}/documentos?tab=proformas`)">
      Volver a documentos electrónicos
    </UButton>

    <h1 class="text-xl font-semibold text-gray-900 mb-1">Nueva proforma</h1>
    <p class="text-sm text-gray-500 mb-8">Cotización interna, sin validez tributaria — se convierte a factura cuando el cliente acepta</p>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <div v-if="!clientes.length" class="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        Necesitas al menos un <NuxtLink :to="`/${urlName}/clientes`" class="underline font-medium">cliente</NuxtLink> activo antes de crear una proforma.
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-800">Datos de la cotización</h2>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Aplicación" name="application_id">
              <USelectMenu v-model="form.application_id" :items="applicationOptions" value-key="value" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Fecha de emisión" name="fecha_emision">
              <UInput v-model="form.fecha_emision" type="date" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Válida hasta" name="fecha_expiracion" hint="Informativo — no expira nada automáticamente">
              <UInput v-model="form.fecha_expiracion" type="date" size="lg" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-800">Cliente</h2>
          </template>
          <UFormField label="Cliente" name="cliente_id">
            <USelectMenu v-model="form.cliente_id" :items="clienteOptions" value-key="value" placeholder="Selecciona un cliente" size="lg" class="w-full" />
          </UFormField>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Detalle</h2>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addLinea">Agregar línea</UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div v-for="(linea, index) in lineas" :key="index" class="p-4 rounded-lg border border-gray-200 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-500">Línea {{ index + 1 }}</span>
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" :disabled="lineas.length === 1" @click="removeLinea(index)" />
              </div>

              <UFormField label="Descripción" name="descripcion">
                <UInput v-model="linea.descripcion" required size="lg" class="w-full" />
              </UFormField>

              <div class="grid grid-cols-4 gap-3">
                <UFormField label="Cantidad" name="cantidad">
                  <UInput v-model.number="linea.cantidad" type="number" min="0.01" step="0.01" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Precio unit." name="precioUnitario">
                  <UInput v-model.number="linea.precioUnitario" type="number" min="0" step="0.01" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Descuento" name="descuento">
                  <UInput v-model.number="linea.descuento" type="number" min="0" step="0.01" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="IVA" name="codigoPorcentaje">
                  <USelectMenu v-model="linea.codigoPorcentaje" :items="tarifaOptions" value-key="value" size="lg" class="w-full" />
                </UFormField>
              </div>

              <p class="text-sm text-gray-500 text-right">
                Subtotal: <span class="font-medium text-gray-900 tabular-nums">${{ lineaSubtotal(linea).toFixed(2) }}</span>
                · IVA: <span class="font-medium text-gray-900 tabular-nums">${{ lineaImpuesto(linea).toFixed(2) }}</span>
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-800">Notas y totales</h2>
          </template>
          <UFormField label="Notas (opcional)" name="notas" class="mb-4">
            <UTextarea v-model="form.notas" :rows="3" class="w-full" placeholder="Condiciones, forma de pago sugerida, vigencia..." />
          </UFormField>

          <div class="space-y-1 text-sm border-t border-gray-100 pt-4">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal sin impuestos</span>
              <span class="tabular-nums">${{ totalSinImpuestos.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Descuento</span>
              <span class="tabular-nums">-${{ totalDescuento.toFixed(2) }}</span>
            </div>
            <div v-for="i in impuestosAgrupados" :key="i.codigoPorcentaje" class="flex justify-between text-gray-500">
              <span>IVA {{ i.tarifa }}%</span>
              <span class="tabular-nums">${{ i.valor.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100 mt-2">
              <span>Total</span>
              <span class="tabular-nums">${{ importeTotal.toFixed(2) }}</span>
            </div>
          </div>
        </UCard>

        <UButton type="submit" color="neutral" block size="lg" :loading="saving" :disabled="!canSubmit">
          Crear proforma
        </UButton>
      </form>
    </template>
  </div>
</template>
