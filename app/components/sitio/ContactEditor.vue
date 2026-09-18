<script setup lang="ts">
import type { SiteContactInfo } from '~/types'

const props = defineProps<{ data: SiteContactInfo; saving: boolean }>()
const emit = defineEmits<{ save: [data: SiteContactInfo] }>()

const form = reactive<SiteContactInfo>(structuredClone(toRaw(props.data)))

const lists = [
  { key: 'phone_numbers', label: 'Teléfonos', placeholder: '+593...' },
  { key: 'email_address', label: 'Emails', placeholder: 'correo@dominio.com' },
] as const

function submit() {
  emit('save', {
    ...form,
    phone_numbers: form.phone_numbers.map((s) => s.trim()).filter(Boolean),
    email_address: form.email_address.map((s) => s.trim()).filter(Boolean),
  })
}
</script>

<template>
  <div class="space-y-6">
    <div v-for="l in lists" :key="l.key">
      <h3 class="text-sm font-semibold text-gray-900 mb-2">{{ l.label }}</h3>
      <div class="space-y-2">
        <div v-for="(_, i) in form[l.key]" :key="i" class="flex gap-2">
          <UInput v-model="form[l.key][i]" :placeholder="l.placeholder" class="flex-1" />
          <UButton variant="ghost" color="error" icon="i-heroicons-trash" @click="form[l.key].splice(i, 1)" />
        </div>
        <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-plus" @click="form[l.key].push('')">Agregar</UButton>
      </div>
    </div>

    <UFormField label="Dirección">
      <UInput v-model="form.address" class="w-full" />
    </UFormField>

    <div class="flex justify-end">
      <UButton color="primary" :loading="saving" @click="submit">Guardar cambios</UButton>
    </div>
  </div>
</template>
