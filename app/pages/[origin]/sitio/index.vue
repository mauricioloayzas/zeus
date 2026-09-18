<script setup lang="ts">
import type { SiteContactInfo, SiteDocument, SiteInformation, SiteLegalDocument } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth', 'origin'] })

const { getAll, save } = useSiteContent()
const toast = useToast()

const documents = ref<Record<string, SiteDocument>>({})
const loading = ref(true)
const savingKey = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    documents.value = await getAll()
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function handleSave(key: string, data: unknown) {
  savingKey.value = key
  try {
    documents.value = { ...documents.value, [key]: await save(key, data) }
    toast.add({ title: 'Cambios guardados', description: 'El sitio los mostrará en menos de un minuto.', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: 'Error', description: (e as Error).message, color: 'error' })
  } finally {
    savingKey.value = null
  }
}

const tabs = [
  { key: 'information', label: 'Información' },
  { key: 'services', label: 'Servicios' },
  { key: 'reviews', label: 'Reseñas' },
  { key: 'skills', label: 'Skills' },
  { key: 'contact_info', label: 'Contacto' },
  { key: 'terms', label: 'Términos' },
  { key: 'privacy', label: 'Privacidad' },
] as const

const activeKey = ref<(typeof tabs)[number]['key']>('information')

// null = todavía no existe el documento en la API (falta correr el seed, ver README).
const doc = computed(() => documents.value[activeKey.value] ?? null)
const updatedAt = computed(() => (doc.value?.updated_at ? new Date(doc.value.updated_at).toLocaleString() : null))

const serviceFields = [
  { path: 'title', label: 'Título' },
  { path: 'icon', label: 'Ícono', placeholder: 'code, credit-cards, mobile...' },
  { path: 'details', label: 'Descripción', type: 'textarea' as const },
]
const reviewFields = [
  { path: 'author.name', label: 'Autor' },
  { path: 'author.designation', label: 'Cargo / descripción' },
  { path: 'content', label: 'Testimonio', type: 'textarea' as const },
]
const newReview = () => ({ id: crypto.randomUUID(), content: '', author: { name: '', designation: '' } })
const reviewLabel = (i: Record<string, unknown>) => String((i.author as { name?: string } | undefined)?.name ?? '')
const skillFields = [
  { path: 'title', label: 'Skill' },
  { path: 'value', label: 'Nivel (0–100)', type: 'number' as const },
]
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Sitio web</h1>
      <p class="text-sm text-gray-500">Contenido público de mauloasan.com. Los cambios se reflejan en el sitio sin necesidad de un nuevo deploy.</p>
    </div>

    <div class="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        :class="[
          'px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
          activeKey === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-900',
        ]"
        @click="activeKey = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-gray-400" />
    </div>

    <div v-else-if="!doc" class="text-center py-16 text-gray-500 border border-gray-200 rounded-xl px-6">
      <UIcon name="i-heroicons-inbox" class="text-5xl mb-3 text-gray-400" />
      <p class="font-medium text-gray-900">Este contenido todavía no se ha cargado en la plataforma</p>
      <p class="text-sm mt-1">Mientras tanto el sitio usa el contenido incluido en su código. Carga el contenido actual con <code class="bg-gray-100 px-1 rounded">npm run seed:prod</code> en mauloasan-nuxt y recarga esta página.</p>
    </div>

    <template v-else>
      <p v-if="updatedAt" class="text-xs text-gray-400 mb-4">Última edición: {{ updatedAt }}</p>

      <!-- :key fuerza a re-montar el editor (que copia sus datos al montar) al cambiar de pestaña. -->
      <SitioInformationEditor
        v-if="activeKey === 'information'"
        :key="activeKey"
        :data="doc.data as SiteInformation"
        :saving="savingKey === activeKey"
        @save="handleSave('information', $event)"
      />
      <SitioListEditor
        v-else-if="activeKey === 'services'"
        :key="activeKey"
        :items="doc.data as Record<string, unknown>[]"
        :fields="serviceFields"
        :new-item="() => ({ title: '', icon: 'code', details: '' })"
        :item-label="(i) => String(i.title ?? '')"
        :saving="savingKey === activeKey"
        @save="handleSave('services', $event)"
      />
      <SitioListEditor
        v-else-if="activeKey === 'reviews'"
        :key="activeKey"
        :items="doc.data as Record<string, unknown>[]"
        :fields="reviewFields"
        :new-item="newReview"
        :item-label="reviewLabel"
        :saving="savingKey === activeKey"
        @save="handleSave('reviews', $event)"
      />
      <SitioListEditor
        v-else-if="activeKey === 'skills'"
        :key="activeKey"
        :items="doc.data as Record<string, unknown>[]"
        :fields="skillFields"
        :new-item="() => ({ title: '', value: 50 })"
        :item-label="(i) => String(i.title ?? '')"
        :saving="savingKey === activeKey"
        @save="handleSave('skills', $event)"
      />
      <SitioContactEditor
        v-else-if="activeKey === 'contact_info'"
        :key="activeKey"
        :data="doc.data as SiteContactInfo"
        :saving="savingKey === activeKey"
        @save="handleSave('contact_info', $event)"
      />
      <SitioLegalEditor
        v-else
        :key="activeKey"
        :data="doc.data as SiteLegalDocument"
        :saving="savingKey === activeKey"
        @save="handleSave(activeKey, $event)"
      />
    </template>
  </div>
</template>
