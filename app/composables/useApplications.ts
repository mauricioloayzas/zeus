import type { Application, ApplicationForm } from '~/types'

// orchestrator/backend/services/applications/*.php devuelven el objeto/array directo (sin
// envolver en {data: ...}), a diferencia de collector/caja-registradora — por eso acá no se
// usa res.data como en el resto de composables de este proyecto.
export function useApplications() {
  const { get, post, put, del } = useApi('auth')

  async function list(): Promise<Application[]> {
    const res = await get<Application[]>('/applications')
    return (res as unknown as Application[]) ?? []
  }

  async function getOne(id: string): Promise<Application> {
    const res = await get<Application>(`/applications/${id}`)
    return res as unknown as Application
  }

  async function create(data: ApplicationForm): Promise<Application> {
    const res = await post<Application>('/applications', data)
    return res as unknown as Application
  }

  async function update(id: string, data: Partial<ApplicationForm>): Promise<Application> {
    const res = await put<Application>(`/applications/${id}`, data)
    return res as unknown as Application
  }

  async function remove(id: string): Promise<void> {
    await del(`/applications/${id}`)
  }

  return { list, getOne, create, update, remove }
}
