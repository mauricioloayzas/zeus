// Flujo de WhatsApp Embedded Signup (Tech Provider): carga el SDK de Facebook, abre el
// login y combina dos cosas que llegan por separado — el `code` (respuesta de FB.login)
// y el waba_id/phone_number_id (evento postMessage que manda Meta durante el signup) —
// en un solo resultado para mandarle a notifier's /whatsapp/connect.
//
// Confirmado en vivo: el puente interno que usa FB.login() para traer el `code` de vuelta
// (channel_url/xd_arbiter) no es confiable — cuando falla, Meta cae a un `fallback_redirect_uri`
// que apunta directo a esta misma página, y la ventana emergente termina mostrando Zeus
// cargado dentro suyo en vez de cerrarse. El bloque RELAY más abajo detecta justo ese caso
// (esta página abierta dentro de un popup, con ?code= en la URL) y le pasa el code a la
// ventana que la abrió — sin eso, el signup se completaba en Meta pero nunca llegaba nada
// de vuelta a Zeus. No se reemplaza FB.login() por un window.open() a mano (ya se probó:
// eso rompe el wizard completo, Meta espera manejar la ventana él mismo).

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

const RELAY_MESSAGE_TYPE = 'ZEUS_META_EMBEDDED_SIGNUP_CODE'

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

  // RELAY: si esta pestaña es en realidad el popup que Meta redirigió de vuelta (porque el
  // puente interno de FB.login() falló), reenvía el `code` a quien la abrió y se cierra. No
  // hace nada si la página se cargó normal (sin opener, o sin ?code en la URL) — en el caso
  // normal (puente interno funciona bien) esto nunca llega a ejecutarse.
  if (import.meta.client) {
    onMounted(() => {
      if (!window.opener) return
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (!code) return
      window.opener.postMessage({ type: RELAY_MESSAGE_TYPE, code }, window.location.origin)
      window.close()
    })
  }

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
        // El code reenviado por nuestra propia página (ver RELAY arriba), cuando el puente
        // interno de FB.login() no entregó el code por su cuenta.
        if (event.origin === window.location.origin) {
          if (event.data?.type === RELAY_MESSAGE_TYPE && event.data.code && !loginCode) {
            loginCode = event.data.code
            tryResolve()
          }
          return
        }

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
        if (response.authResponse?.code && !loginCode) {
          loginCode = response.authResponse.code
          tryResolve()
        } else if (!loginCode) {
          // No se rechaza de una: puede que el RELAY (arriba) todavía entregue el code por
          // el camino del fallback_redirect_uri — se le da un margen antes de darse por
          // vencido, en vez de cortar la promesa apenas FB.login() vuelve sin code.
          setTimeout(() => {
            if (!loginCode) {
              window.removeEventListener('message', onMessage)
              reject(new Error(
                'No se completó el login de Facebook. Si viste un error de Facebook en la ventana '
                + '("Sorry, something went wrong"), prueba en una ventana de incógnito o desactiva '
                + 'temporalmente tu bloqueador de anuncios/extensiones.',
              ))
            }
          }, 5000)
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
