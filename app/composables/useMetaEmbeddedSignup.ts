// Flujo de WhatsApp Embedded Signup (Tech Provider): abre el diálogo OAuth de Meta en una
// ventana emergente y combina dos cosas que llegan por separado — el `code` y el
// waba_id/phone_number_id (evento postMessage que manda Meta durante el signup) — en un solo
// resultado para mandarle a notifier's /whatsapp/connect.
//
// A diferencia de la versión anterior (y de caja-registradora/frontend), esta NO usa
// FB.login() del SDK de JS — se confirmó en vivo que el puente que usa FB.login()
// (channel_url/xd_arbiter, un iframe de staticxx.facebook.com) no entrega el `code` de
// forma confiable en algunos navegadores, mientras que navegar directo a la misma URL de
// Meta sí funciona siempre. Acá se arma esa misma URL a mano y se abre con window.open() —
// sin el puente de por medio — y el `code` se recupera por un mecanismo propio: el
// redirect_uri apunta de vuelta a esta misma página, que al detectar `?code=` en la URL
// (ver el onMounted más abajo) se lo reenvía a la ventana que la abrió y se cierra sola.
//
// Requiere que el dominio esté en "Valid OAuth Redirect URIs" de Facebook Login (Configuración
// del producto), además de "Allowed Domains for the JavaScript SDK" — antes solo hacía falta
// esto último porque FB.login() no pasaba por un redirect_uri real.

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

export function useMetaEmbeddedSignup() {
  const config = useRuntimeConfig()

  // Si esta pestaña es en realidad el popup que Meta redirigió de vuelta con ?code=...,
  // reenvía el code a quien la abrió (window.opener) y se cierra. No hace nada si la página
  // se cargó normal (sin opener, o sin ?code en la URL).
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

    return new Promise((resolve, reject) => {
      let signupData: { wabaId?: string, phoneNumberId?: string, businessId?: string, isCoexistence?: boolean } = {}
      let loginCode: string | undefined
      let settled = false
      let closeCheck: ReturnType<typeof setInterval> | undefined

      function cleanup() {
        window.removeEventListener('message', onMessage)
        if (closeCheck) clearInterval(closeCheck)
      }

      function finishResolve() {
        if (settled || !loginCode || !signupData.wabaId) return
        settled = true
        cleanup()
        resolve({
          code: loginCode,
          wabaId: signupData.wabaId,
          phoneNumberId: signupData.phoneNumberId,
          businessId: signupData.businessId,
          isCoexistence: signupData.isCoexistence ?? false,
        })
      }

      function finishReject(message: string) {
        if (settled) return
        settled = true
        cleanup()
        reject(new Error(message))
      }

      function onMessage(event: MessageEvent) {
        // El code relanzado por nuestra propia página (ver onMounted arriba).
        if (event.origin === window.location.origin) {
          if (event.data?.type === RELAY_MESSAGE_TYPE && event.data.code) {
            loginCode = event.data.code
            finishResolve()
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
            finishResolve()
          } else if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            signupData = {
              wabaId: data.data?.waba_id,
              businessId: data.data?.business_id,
              isCoexistence: true,
            }
            finishResolve()
          } else if (data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_OBO_MIGRATION') {
            finishReject('Este tipo de conexión de WhatsApp todavía no está soportado.')
          } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
            finishReject(data.data?.error_message || 'Se canceló la conexión con WhatsApp')
          }
        } catch {
          // mensajes de otros orígenes/formatos, se ignoran
        }
      }

      window.addEventListener('message', onMessage)

      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const dialogParams = new URLSearchParams({
        app_id: appId,
        config_id: configId,
        response_type: 'code',
        override_default_response_type: 'true',
        extras: JSON.stringify({ setup: {} }),
        redirect_uri: redirectUri,
        display: 'popup',
      })

      const popup = window.open(
        `https://www.facebook.com/v25.0/dialog/oauth?${dialogParams.toString()}`,
        'meta_embedded_signup',
        'width=600,height=720,menubar=no,toolbar=no,status=no',
      )

      if (!popup) {
        finishReject('El navegador bloqueó la ventana emergente — permití popups para este sitio e intentá de nuevo.')
        return
      }

      closeCheck = setInterval(() => {
        if (popup.closed) {
          finishReject('Se cerró la ventana de conexión antes de completar el proceso.')
        }
      }, 1000)
    })
  }

  return { launch }
}
