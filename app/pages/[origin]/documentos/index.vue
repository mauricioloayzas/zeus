<script setup lang="ts">
import type { Factura } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { list: listFacturas } = useFacturas()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const facturas = ref<Factura[]>([])
const loading = ref(true)

async function load() {
  if (!profileId.value) return
  loading.value = true
  try {
    facturas.value = (await listFacturas(profileId.value)).sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(profileId, load)

function estadoColor(estado: string) {
  if (estado === 'autorizado') return 'success'
  if (estado === 'rechazado' || estado === 'anulado') return 'error'
  return 'neutral'
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-mauloasan-dark">Documentos electrónicos</h1>
      <p class="text-sm text-gray-500">Facturas emitidas por {{ activeOrigin?.profile.name }} (ej. por cada cobro de suscripción)</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
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
</template>
