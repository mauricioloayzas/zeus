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
    },
  },

  colorMode: {
    preference: 'light',
  },
})
