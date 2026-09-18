<script setup lang="ts">
// Editor genérico de listas de objetos (servicios, reseñas, skills...). Cada campo se
// declara con un path (admite anidado: 'author.name') y un tipo de input.
interface ListField {
  path: string
  label: string
  type?: 'text' | 'textarea' | 'number'
  placeholder?: string
}

const props = defineProps<{
  items: Record<string, unknown>[]
  fields: ListField[]
  newItem: () => Record<string, unknown>
  itemLabel: (item: Record<string, unknown>) => string
  saving: boolean
}>()

const emit = defineEmits<{ save: [items: Record<string, unknown>[]] }>()

const list = ref<Record<string, unknown>[]>(structuredClone(toRaw(props.items)))

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj)
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  let target = obj
  for (const k of keys) {
    if (typeof target[k] !== 'object' || target[k] === null) target[k] = {}
    target = target[k] as Record<string, unknown>
  }
  target[last] = value
}

function move(index: number, delta: number) {
  const to = index + delta
  if (to < 0 || to >= list.value.length) return
  const [item] = list.value.splice(index, 1)
  list.value.splice(to, 0, item!)
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="(item, i) in list" :key="i" class="border border-gray-200 rounded-xl p-4 bg-white">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-medium text-gray-900 truncate">{{ itemLabel(item) || `Elemento ${i + 1}` }}</p>
        <div class="flex shrink-0">
          <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-arrow-up" :disabled="i === 0" @click="move(i, -1)" />
          <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-arrow-down" :disabled="i === list.length - 1" @click="move(i, 1)" />
          <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="list.splice(i, 1)" />
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField
          v-for="f in fields"
          :key="f.path"
          :label="f.label"
          :class="f.type === 'textarea' ? 'sm:col-span-2' : ''"
        >
          <UTextarea
            v-if="f.type === 'textarea'"
            :model-value="(getPath(item, f.path) as string) ?? ''"
            :placeholder="f.placeholder"
            :rows="3"
            class="w-full"
            @update:model-value="setPath(item, f.path, $event)"
          />
          <UInput
            v-else
            :model-value="String(getPath(item, f.path) ?? '')"
            :type="f.type === 'number' ? 'number' : 'text'"
            :placeholder="f.placeholder"
            class="w-full"
            @update:model-value="setPath(item, f.path, f.type === 'number' ? Number($event) : $event)"
          />
        </UFormField>
      </div>
    </div>

    <p v-if="!list.length" class="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
      Sin elementos
    </p>

    <div class="flex items-center justify-between pt-2">
      <UButton variant="soft" color="neutral" icon="i-heroicons-plus" @click="list.push(newItem())">Agregar</UButton>
      <UButton color="primary" :loading="saving" @click="emit('save', list)">Guardar cambios</UButton>
    </div>
  </div>
</template>
