<script setup lang="ts">
import type { SiteInformation } from '~/types'

const props = defineProps<{ data: SiteInformation; saving: boolean }>()
const emit = defineEmits<{ save: [data: SiteInformation] }>()

const form = reactive<SiteInformation>(structuredClone(toRaw(props.data)))

const textFields: { key: keyof SiteInformation; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'address', label: 'Ciudad / dirección' },
  { key: 'born_date', label: 'Fecha de nacimiento (AAAA-MM-DD)' },
  { key: 'nationality', label: 'Nacionalidad' },
  { key: 'language', label: 'Idiomas' },
  { key: 'freelance_status', label: 'Estado freelance' },
]

const imageFields: { key: keyof SiteInformation; label: string }[] = [
  { key: 'brand_image', label: 'Logo (ruta)' },
  { key: 'about_image', label: 'Foto "Sobre mí" (ruta)' },
  { key: 'about_image_lg', label: 'Foto "Sobre mí" grande (ruta)' },
  { key: 'cvfile', label: 'Archivo de CV (ruta)' },
]

const socialKeys = computed(() => Object.keys(form.social_links ?? {}))
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField v-for="f in textFields" :key="f.key" :label="f.label">
        <UInput v-model="form[f.key] as string" class="w-full" />
      </UFormField>
      <UFormField label="Acerca de" class="sm:col-span-2">
        <UTextarea v-model="form.about_content" :rows="4" class="w-full" />
      </UFormField>
    </div>

    <div>
      <h3 class="text-sm font-semibold text-gray-900 mb-2">Redes sociales</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField v-for="k in socialKeys" :key="k" :label="k">
          <UInput v-model="form.social_links[k]" placeholder="https://..." class="w-full" />
        </UFormField>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-semibold text-gray-900 mb-1">Imágenes y archivos</h3>
      <p class="text-xs text-gray-500 mb-2">Rutas de archivos que ya existen en el sitio (ej. /images/me.jpg). La subida de archivos desde Zeus queda para una fase posterior.</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField v-for="f in imageFields" :key="f.key" :label="f.label">
          <UInput v-model="form[f.key] as string" class="w-full" />
        </UFormField>
      </div>
    </div>

    <div class="flex justify-end">
      <UButton color="primary" :loading="saving" @click="emit('save', form)">Guardar cambios</UButton>
    </div>
  </div>
</template>
