<script setup lang="ts">
import type { SiteLegalDocument } from '~/types'

const props = defineProps<{ data: SiteLegalDocument; saving: boolean }>()
const emit = defineEmits<{ save: [data: SiteLegalDocument] }>()

const form = reactive<SiteLegalDocument>(structuredClone(toRaw(props.data)))
const preview = ref(false)
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField label="Título">
        <UInput v-model="form.title" class="w-full" />
      </UFormField>
      <UFormField label="Última actualización" hint="Texto libre, ej. 27 de julio de 2026">
        <UInput v-model="form.lastUpdated" class="w-full" />
      </UFormField>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-sm font-medium text-gray-900">Contenido (HTML)</label>
        <UButton size="xs" variant="ghost" color="neutral" :icon="preview ? 'i-heroicons-code-bracket' : 'i-heroicons-eye'" @click="preview = !preview">
          {{ preview ? 'Editar' : 'Vista previa' }}
        </UButton>
      </div>
      <UTextarea v-if="!preview" v-model="form.html" :rows="24" class="w-full font-mono text-xs" />
      <!-- eslint-disable-next-line vue/no-v-html -- HTML escrito por el Owner en este mismo formulario -->
      <div v-else class="legal-preview border border-gray-200 rounded-xl p-5 bg-white text-sm text-gray-800" v-html="form.html" />
      <p class="text-xs text-gray-500 mt-1">Usa &lt;h3&gt; para títulos de sección, &lt;p&gt; para párrafos y &lt;ul class="stylish-list"&gt; para listas.</p>
    </div>

    <div class="flex justify-end">
      <UButton color="primary" :loading="saving" @click="emit('save', form)">Guardar cambios</UButton>
    </div>
  </div>
</template>

<style scoped>
.legal-preview :deep(h3) { font-weight: 600; margin: 1.25rem 0 0.5rem; }
.legal-preview :deep(p) { margin-bottom: 0.75rem; }
.legal-preview :deep(ul) { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
.legal-preview :deep(a) { color: var(--color-brand-500, #2563eb); text-decoration: underline; }
</style>
