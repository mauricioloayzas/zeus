// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Zeus',
      meta: [{ name: 'description', content: 'Zeus — panel de administración de la plataforma' }],
    },
  },

  nitro: {
    // ssr:false hace que "/" no tenga links reales que el crawler de Nitro pueda seguir
    // para descubrir el resto de páginas estáticas (login, sin-acceso) — sin esto, según el
    // entorno de build, a veces las prerenderiza igual (heurística de Nuxt) y a veces no
    // (visto en el build de Amplify: solo prerenderizó 200/404/index). Se listan a mano para
    // que sea determinístico. Las rutas dinámicas [origin]/* no se prerenderizan — dependen
    // de datos en runtime, las sirve el fallback SPA (200.html) vía la regla de Amplify.
    prerender: {
      routes: ['/login', '/sin-acceso'],
    },
  },

  runtimeConfig: {
    public: {
      apiAuthBase: process.env.NUXT_PUBLIC_API_AUTH_BASE || '',
      apiCollectorBase: process.env.NUXT_PUBLIC_API_COLLECTOR_BASE || '',
      apiCajaBase: process.env.NUXT_PUBLIC_API_CAJA_BASE || '',
      apiNotifierBase: process.env.NUXT_PUBLIC_API_NOTIFIER_BASE || '',
      apiYupanaBase: process.env.NUXT_PUBLIC_API_YUPANA_BASE || '',
      // Bootstrap del login: /auth/login exige un appId válido para resolver contra qué
      // Application autenticar, pero todas las apps comparten un mismo Cognito User Pool —
      // Zeus usa el de Clichín acá solo para entrar, y después navega libremente entre
      // cualquier perfil "origin" (de cualquier app) sobre el que el usuario tenga RBAC.
      apiAppId: process.env.NUXT_PUBLIC_API_APP_ID || '',
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
      metaAppId: process.env.NUXT_PUBLIC_META_APP_ID || '',
      metaConfigId: process.env.NUXT_PUBLIC_META_CONFIG_ID || '',
    },
  },

  colorMode: {
    preference: 'light',
  },
})
