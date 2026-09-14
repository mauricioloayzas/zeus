<script setup lang="ts">
import type { CuentaContableProfile, MayorContable } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { activeOrigin } = useZeusContext()
const { list: listCuentas, activar } = useCuentasContables()
const { listByCuenta } = useMayorContable()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

const cuentas = ref<CuentaContableProfile[]>([])
const selectedCuentaId = ref<string>('')
const mayor = ref<MayorContable[]>([])
const loadingCuentas = ref(true)
const loadingMayor = ref(false)
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
  loadCuentas()
  selectedCuentaId.value = ''
})
onMounted(loadCuentas)
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-mauloasan-dark">Contabilidad</h1>
      <p class="text-sm text-gray-500">Libro mayor de {{ activeOrigin?.profile.name }}</p>
    </div>

    <div v-if="loadingCuentas" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>
    <div v-else-if="!cuentas.length" class="border border-gray-200 rounded-xl p-10 text-center mt-6">
      <UIcon name="i-heroicons-calculator" class="text-4xl text-gray-300 mx-auto mb-3" />
      <h2 class="text-base font-medium text-mauloasan-dark mb-1">Todavía no se activó la contabilidad</h2>
      <p class="text-sm text-gray-500 max-w-sm mx-auto mb-5">
        Al activar, se clona el plan de cuentas oficial NIIF hacia {{ activeOrigin?.profile.name }}: queda
        listo para registrar asientos, mayorizar y llevar la contabilidad formal.
      </p>
      <UButton color="primary" :loading="activando" @click="handleActivar">Activar módulo de contabilidad</UButton>
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
</template>
