<script setup lang="ts">
import type { PuntoEmision } from '~/types'

definePageMeta({ layout: 'admin' })

const { activeOrigin } = useZeusContext()
const { getOne, update: updateProfile } = useProfiles()
const { fetchContribuyente, update: updateContribuyente } = useContribuyente()
const { fetchSign, save: saveSign } = useElectronicSign()
const { list: listPuntos, create: createPunto, update: updatePunto, remove: removePunto } = usePuntosEmision()
const toast = useToast()

const profileId = computed(() => activeOrigin.value?.profile.id ?? '')

// --- RUC / datos tributarios ---
const taxForm = reactive({ tax_id: '', tax_id_type: 'RUC' as 'RUC' | 'CEDULA' })
const savingTax = ref(false)

// --- Contribuyente (nombre comercial, dirección, régimen) ---
const contribuyenteForm = reactive({ nombre_comercial: '', direccion_matriz: '', regimen: '0' as '0' | '1' | '2' | '3' })
const savingContribuyente = ref(false)
const regimenOptions = [
  { label: 'General', value: '0' },
  { label: 'RIMPE Emprendedor', value: '1' },
  { label: 'RIMPE Negocio Popular', value: '2' },
  { label: 'Régimen Microempresas', value: '3' },
]

// --- Firma electrónica ---
const signPassword = ref('')
const signFile = ref<File | null>(null)
const hasSign = ref(false)
const savingSign = ref(false)

// --- Puntos de emisión ---
const puntos = ref<PuntoEmision[]>([])
const showPuntoModal = ref(false)
const editingPunto = ref<PuntoEmision | null>(null)
const puntoForm = reactive({ estab: '', pto_emi: '', descripcion: '' })
const savingPunto = ref(false)

const loading = ref(true)

async function load() {
  if (!profileId.value) return
  loading.value = true
  try {
    const [profile, contribuyente, sign, puntosData] = await Promise.all([
      getOne(profileId.value),
      fetchContribuyente(profileId.value),
      fetchSign(profileId.value),
      listPuntos(profileId.value),
    ])
    taxForm.tax_id = profile.tax_id ?? ''
    taxForm.tax_id_type = (profile.tax_id_type as 'RUC' | 'CEDULA') ?? 'RUC'
    contribuyenteForm.nombre_comercial = contribuyente?.nombre_comercial ?? ''
    contribuyenteForm.direccion_matriz = contribuyente?.direccion_matriz ?? ''
    contribuyenteForm.regimen = (contribuyente?.regimen as '0' | '1' | '2' | '3') ?? '0'
    hasSign.value = !!sign
    puntos.value = puntosData
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(profileId, load)

async function saveTax() {
  if (!profileId.value) return
  savingTax.value = true
  try {
    await updateProfile(profileId.value, { tax_id: taxForm.tax_id, tax_id_type: taxForm.tax_id_type } as never)
    toast.add({ title: 'RUC guardado', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    savingTax.value = false
  }
}

async function saveContribuyente() {
  if (!profileId.value) return
  savingContribuyente.value = true
  try {
    await updateContribuyente(profileId.value, contribuyenteForm)
    toast.add({ title: 'Información tributaria guardada', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    savingContribuyente.value = false
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function saveElectronicSign() {
  if (!profileId.value || !signFile.value || !signPassword.value) return
  savingSign.value = true
  try {
    const base64 = await fileToBase64(signFile.value)
    await saveSign(profileId.value, base64, signPassword.value)
    toast.add({ title: 'Firma electrónica guardada', color: 'success' })
    signFile.value = null
    signPassword.value = ''
    hasSign.value = true
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    savingSign.value = false
  }
}

function openCreatePunto() {
  editingPunto.value = null
  puntoForm.estab = ''
  puntoForm.pto_emi = ''
  puntoForm.descripcion = ''
  showPuntoModal.value = true
}

function openEditPunto(p: PuntoEmision) {
  editingPunto.value = p
  puntoForm.estab = p.estab
  puntoForm.pto_emi = p.pto_emi
  puntoForm.descripcion = p.descripcion ?? ''
  showPuntoModal.value = true
}

async function submitPunto() {
  if (!profileId.value) return
  savingPunto.value = true
  try {
    if (editingPunto.value) {
      await updatePunto(profileId.value, editingPunto.value.id, { descripcion: puntoForm.descripcion })
      toast.add({ title: 'Punto de emisión actualizado', color: 'success' })
    } else {
      await createPunto(profileId.value, { estab: puntoForm.estab, pto_emi: puntoForm.pto_emi, descripcion: puntoForm.descripcion })
      toast.add({ title: 'Punto de emisión creado', color: 'success' })
    }
    showPuntoModal.value = false
    puntos.value = await listPuntos(profileId.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    savingPunto.value = false
  }
}

async function deletePunto(p: PuntoEmision) {
  if (!profileId.value) return
  if (!confirm(`¿Eliminar el punto de emisión ${p.estab}-${p.pto_emi}?`)) return
  try {
    await removePunto(profileId.value, p.id)
    toast.add({ title: 'Punto de emisión eliminado', color: 'success' })
    puntos.value = await listPuntos(profileId.value)
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4 space-y-8">
    <div>
      <h1 class="text-xl font-semibold text-gray-900">Configuración de {{ activeOrigin?.profile.name }}</h1>
      <p class="text-sm text-gray-500">RUC, firma electrónica y puntos de emisión para facturar como plataforma</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <template v-else>
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-800">RUC / identificación tributaria</h2>
        </template>
        <form class="space-y-4" @submit.prevent="saveTax">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Tipo de identificación" name="tax_id_type">
              <USelectMenu
                v-model="taxForm.tax_id_type"
                :items="[{ label: 'RUC', value: 'RUC' }, { label: 'Cédula', value: 'CEDULA' }]"
                value-key="value"
                size="lg"
                class="w-full"
              />
            </UFormField>
            <UFormField label="RUC / Cédula" name="tax_id">
              <UInput v-model="taxForm.tax_id" size="lg" class="w-full" />
            </UFormField>
          </div>
          <UButton type="submit" color="primary" size="lg" :loading="savingTax">Guardar</UButton>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-800">Información tributaria</h2>
        </template>
        <form class="space-y-4" @submit.prevent="saveContribuyente">
          <UFormField label="Nombre comercial" name="nombre_comercial" help="Aparece en el detalle del comprobante; si lo dejas vacío se usa la razón social">
            <UInput v-model="contribuyenteForm.nombre_comercial" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Dirección matriz" name="direccion_matriz">
            <UInput v-model="contribuyenteForm.direccion_matriz" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Régimen" name="regimen">
            <USelectMenu v-model="contribuyenteForm.regimen" :items="regimenOptions" value-key="value" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" size="lg" :loading="savingContribuyente">Guardar</UButton>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-800">Firma electrónica</h2>
        </template>
        <p class="text-sm mb-4" :class="hasSign ? 'text-emerald-700' : 'text-amber-700'">
          <UIcon :name="hasSign ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'" class="inline" />
          {{ hasSign ? 'Ya hay un certificado configurado. Subir uno nuevo lo reemplaza.' : 'Todavía no hay certificado configurado — sin esto no se pueden autorizar comprobantes ante el SRI.' }}
        </p>
        <form class="space-y-4" @submit.prevent="saveElectronicSign">
          <UFormField label="Certificado (.p12)" name="file">
            <input
              type="file"
              accept=".p12,.pfx"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700"
              @change="signFile = ($event.target as HTMLInputElement).files?.[0] ?? null"
            >
          </UFormField>
          <UFormField label="Contraseña del certificado" name="password">
            <UInput v-model="signPassword" type="password" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" size="lg" :loading="savingSign" :disabled="!signFile || !signPassword">
            Guardar firma electrónica
          </UButton>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-800">Puntos de emisión</h2>
            <UButton size="sm" color="primary" icon="i-heroicons-plus" @click="openCreatePunto">Nuevo</UButton>
          </div>
        </template>
        <div v-if="!puntos.length" class="text-sm text-gray-400 py-4 text-center">Sin puntos de emisión configurados</div>
        <table v-else class="w-full text-sm">
          <thead class="text-gray-500 text-left">
            <tr>
              <th class="py-2 font-medium">Estab-PtoEmi</th>
              <th class="py-2 font-medium">Descripción</th>
              <th class="py-2 font-medium">Estado</th>
              <th class="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="p in puntos" :key="p.id">
              <td class="py-2 font-medium text-gray-900 tabular-nums">{{ p.estab }}-{{ p.pto_emi }}</td>
              <td class="py-2 text-gray-500">{{ p.descripcion || '—' }}</td>
              <td class="py-2">
                <UBadge :color="p.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                  {{ p.status === 'active' ? 'Activo' : 'Inactivo' }}
                </UBadge>
              </td>
              <td class="py-2 text-right">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEditPunto(p)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deletePunto(p)" />
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <UModal v-model:open="showPuntoModal" :title="editingPunto ? 'Editar punto de emisión' : 'Nuevo punto de emisión'">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitPunto">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Estab" name="estab">
              <UInput v-model="puntoForm.estab" :disabled="!!editingPunto" maxlength="3" placeholder="001" required size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Pto. emisión" name="pto_emi">
              <UInput v-model="puntoForm.pto_emi" :disabled="!!editingPunto" maxlength="3" placeholder="001" required size="lg" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Descripción" name="descripcion">
            <UInput v-model="puntoForm.descripcion" placeholder="Ej. Caja principal" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" color="primary" block size="lg" :loading="savingPunto">
            {{ editingPunto ? 'Guardar cambios' : 'Crear punto de emisión' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
