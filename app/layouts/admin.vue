<script setup lang="ts">
// El middleware NO se declara acá — definePageMeta solo tiene efecto en archivos de
// pages/, no en layouts/ (era un no-op silencioso: por eso al recargar la página de una,
// sin haber navegado antes desde adentro de la app, el estado quedaba vacío). Cada página
// que usa layout: 'admin' declara ['auth', 'origin'] en su propio definePageMeta.

const { user, clearSession } = useAuth()
const { activeOrigin, isOwner, clearContext } = useZeusContext()

const route = useRoute()
const router = useRouter()

const urlName = computed(() => route.params.origin as string)
const sidebarOpen = ref(false)

watch(() => route.path, () => { sidebarOpen.value = false })

// Aplicaciones/Perfiles/Planes son de plataforma (no cambian con la app elegida en el
// dropdown, salvo Perfiles/Planes que sí filtran por ella dentro de cada página).
const ownerLinks = [
  { label: 'Aplicaciones', icon: 'i-heroicons-squares-2x2', slug: 'aplicaciones' },
  { label: 'Perfiles', icon: 'i-heroicons-user-group', slug: 'perfiles' },
  { label: 'Planes', icon: 'i-heroicons-tag', slug: 'planes' },
]
// Documentos electrónicos y Contabilidad: mismo criterio que caja-registradora (secciones
// separadas), visibles para cualquiera con acceso a origin — no solo Owner.
const sharedLinks = [
  { label: 'Suscripciones', icon: 'i-heroicons-credit-card', slug: 'suscripciones' },
  { label: 'Documentos electrónicos', icon: 'i-heroicons-document-text', slug: 'documentos' },
  { label: 'Contabilidad', icon: 'i-heroicons-calculator', slug: 'contabilidad' },
  { label: 'Reportes', icon: 'i-heroicons-chart-bar-square', slug: 'reportes' },
]
// Configuración SRI y WhatsApp son del perfil origin en sí, no de una app puntual — son
// iguales sin importar qué aplicación esté elegida en el dropdown de la derecha.
const ownerOnlyExtra = [
  { label: 'Configuración', icon: 'i-heroicons-cog-6-tooth', slug: 'configuracion' },
  { label: 'WhatsApp', icon: 'i-heroicons-chat-bubble-left-right', slug: 'whatsapp' },
]

const navLinks = computed(() => {
  const links = isOwner.value ? [...ownerLinks, ...sharedLinks, ...ownerOnlyExtra] : sharedLinks
  return links.map((l) => ({ ...l, to: `/${urlName.value}/${l.slug}` }))
})

async function logout() {
  clearSession()
  clearContext()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/40 z-40 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-gray-200 flex flex-col transition-transform duration-200',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-mauloasan-dark flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-bolt" class="text-white text-xl" />
          </div>
          <div>
            <h1 class="font-bold text-gray-900 text-sm">Zeus</h1>
            <p class="text-xs text-gray-500">Administración de plataforma</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          active-class="bg-brand-500 text-white hover:bg-brand-500 hover:text-white"
          @click="sidebarOpen = false"
        >
          <UIcon :name="link.icon" class="text-lg shrink-0" />
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3 mb-3 px-3">
          <UAvatar :alt="user?.name || user?.email" size="sm" class="bg-mauloasan-dark text-white" />
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-900 truncate">{{ user?.name || 'Usuario' }}</p>
            <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
          </div>
        </div>
        <UButton
          block
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-right-on-rectangle"
          size="sm"
          @click="logout"
        >
          Cerrar sesión
        </UButton>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0">
      <div class="bg-surface border-b border-gray-200 px-4 sm:px-8 py-3 flex items-center gap-3">
        <UButton
          class="lg:hidden"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-bars-3"
          size="sm"
          @click="sidebarOpen = true"
        />
        <div class="flex-1 flex justify-end">
          <p v-if="activeOrigin" class="text-sm text-gray-500">
            {{ activeOrigin.profile.name }} · todas las aplicaciones
          </p>
        </div>
      </div>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
