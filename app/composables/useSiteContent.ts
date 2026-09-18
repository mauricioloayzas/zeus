import type { SiteDocument } from '~/types'

// Slug del sitio público en la tabla site_content del orchestrator (mismo valor que
// NUXT_SITE_ID en mauloasan-nuxt). Hoy Zeus administra un único sitio.
const SITE_ID = 'mauloasan'

// GET /site-content/{site} devuelve { data: { <key>: { data, updated_at } } } y
// PUT /site-content/{site}/{key} devuelve { data, updated_at } — ninguno usa el envoltorio
// {data: ...} de collector/caja, por eso se castea a través de unknown como useApplications.
export function useSiteContent() {
  const { get, put } = useApi('auth')

  async function getAll(): Promise<Record<string, SiteDocument>> {
    const res = await get<Record<string, SiteDocument>>(`/site-content/${SITE_ID}`)
    return (res as unknown as { data: Record<string, SiteDocument> }).data ?? {}
  }

  async function save<T>(key: string, data: T): Promise<SiteDocument<T>> {
    const res = await put<SiteDocument<T>>(`/site-content/${SITE_ID}/${key}`, { data })
    return res as unknown as SiteDocument<T>
  }

  return { getAll, save }
}
