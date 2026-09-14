// Flujo de WhatsApp Embedded Signup (Tech Provider): carga el SDK de Facebook, abre el
// login y combina dos cosas que llegan por separado — el `code` (respuesta de FB.login)
// y el waba_id/phone_number_id (evento postMessage que manda Meta durante el signup) —
// en un solo resultado para mandarle a notifier's /whatsapp/connect.
//
// Se volvió a FB.login() (el mecanismo gestionado por el SDK) después de probar reemplazarlo
// por un window.open() a mano: ese cambio rompió la entrega del `code` al final del wizard de
// varios pasos (Meta cierra la ventana sola al terminar en vez de redirigir a un redirect_uri
// nuestro) — confirmado en vivo, el proceso se completaba en la ventana de Meta pero nunca
// llegaba nada a Zeus. El diagnóstico original de "el puente de FB.login() está roto" fue
// prematuro: en todos los intentos previos el flujo fallaba de entrada por el featureType
// faltante (ver extras más abajo), así que nunca se llegó a probar FB.login() con un signup
// que de verdad avanzara hasta el final.

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void
      login: (callback: (response: FacebookLoginResponse) => void, params: Record<string, unknown>) => void
    }
    fbAsyncInit?: () => void
  }
}

interface FacebookLoginResponse {
  authResponse?: { code?: string }
  status?: string
}

interface EmbeddedSignupResult {
  code: string
  wabaId: string
  /** Ausente cuando el evento fue FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING (Coexistence) — Meta
   * solo manda el waba_id en ese caso, el backend resuelve el número con getPhoneNumbersForWaba(). */
  phoneNumberId?: string
  businessId?: string
  /** true si se conectó la cuenta YA existente de la app de WhatsApp Business en vez de un
   * número nuevo — sigue funcionando en la app del celular en paralelo a Zeus/Clichín. */
  isCoexistence: boolean
}

let sdkLoadPromise: Promise<void> | null = null

function loadFacebookSdk(appId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: 'v25.0',
      })
      resolve()
    }

    if (document.getElementById('facebook-jssdk')) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  })

  return sdkLoadPromise
}

export function useMetaEmbeddedSignup() {
  const config = useRuntimeConfig()

  async function launch(): Promise<EmbeddedSignupResult> {
    const appId = config.public.metaAppId as string
    const configId = config.public.metaConfigId as string

    if (!appId || !configId) {
      throw new Error('Falta configurar NUXT_PUBLIC_META_APP_ID / NUXT_PUBLIC_META_CONFIG_ID')
    }

    await loadFacebookSdk(appId)

    return new Promise((resolve, reject) => {
      let signupData: { wabaId?: string, phoneNumberId?: string, businessId?: string, isCoexistence?: boolean } = {}
      let loginCode: string | undefined

      function tryResolve() {
        if (loginCode && signupData.wabaId) {
          window.removeEventListener('message', onMessage)
          resolve({
            code: loginCode,
            wabaId: signupData.wabaId,
            phoneNumberId: signupData.phoneNumberId,
            businessId: signupData.businessId,
            isCoexistence: signupData.isCoexistence ?? false,
          })
        }
      }

      function onMessage(event: MessageEvent) {
        if (!event.origin.endsWith('facebook.com')) return

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (data?.type !== 'WA_EMBEDDED_SIGNUP') return

          if (data.event === 'FINISH') {
            signupData = {
              wabaId: data.data?.waba_id,
              phoneNumberId: data.data?.phone_number_id,
              businessId: data.data?.business_id,
              isCoexistence: false,
            }
            tryResolve()
          } else if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            signupData = {
              wabaId: data.data?.waba_id,
              businessId: data.data?.business_id,
              isCoexistence: true,
            }
            tryResolve()
          } else if (data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_OBO_MIGRATION') {
            window.removeEventListener('message', onMessage)
            reject(new Error('Este tipo de conexión de WhatsApp todavía no está soportado.'))
          } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
            window.removeEventListener('message', onMessage)
            reject(new Error(data.data?.error_message || 'Se canceló la conexión con WhatsApp'))
          }
        } catch {
          // mensajes de otros orígenes/formatos, se ignoran
        }
      }

      window.addEventListener('message', onMessage)

      window.FB?.login((response) => {
        if (response.authResponse?.code) {
          loginCode = response.authResponse.code
          tryResolve()
        } else {
          window.removeEventListener('message', onMessage)
          reject(new Error(
            'No se completó el login de Facebook. Si viste un error de Facebook en la ventana '
            + '("Sorry, something went wrong"), prueba en una ventana de incógnito o desactiva '
            + 'temporalmente tu bloqueador de anuncios/extensiones.',
          ))
        }
      }, {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        // El extras "simplificado" ({setup:{}}) que documenta v4 para el caso general no
        // ofrece la opción de Coexistence en la práctica (confirmado en vivo: siempre tira
        // "ya registrado" en vez de dejar elegir) — hace falta este featureType explícito,
        // mismo formato que genera el propio Meta App Dashboard para "Onboard business app
        // users". Confirmado que con esto siguen apareciendo ambas opciones (cuenta existente
        // o número nuevo), no restringe nada.
        extras: { version: 'v4', sessionInfoVersion: '3', featureType: 'whatsapp_business_app_onboarding' },
      })
    })
  }

  return { launch }
}
