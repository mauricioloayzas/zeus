import type { Profile, ProfileForm } from '~/types'

// Igual que useApplications: orchestrator/backend/services/profiles/*.php devuelven el
// objeto/array directo, sin envolver en {data: ...}.
export function useProfiles() {
  const { get, post, put, patch, del } = useApi('auth')

  async function list(): Promise<Profile[]> {
    const res = await get<Profile[]>('/profiles')
    return (res as unknown as Profile[]) ?? []
  }

  async function getOne(id: string): Promise<Profile> {
    const res = await get<Profile>(`/profiles/${id}`)
    return res as unknown as Profile
  }

  /** parentId = perfil "origin" bajo el cual se crea (o un contador, si aplica). */
  async function create(parentId: string, data: ProfileForm): Promise<Profile> {
    const res = await post<Profile>(`/profiles/${parentId}/children`, data)
    return res as unknown as Profile
  }

  async function update(id: string, data: Partial<ProfileForm>): Promise<Profile> {
    const res = await put<Profile>(`/profiles/${id}`, data)
    return res as unknown as Profile
  }

  async function updateStatus(id: string, status: string): Promise<Profile> {
    const res = await patch<Profile>(`/profiles/${id}/status`, { status })
    return res as unknown as Profile
  }

  async function remove(id: string): Promise<void> {
    await del(`/profiles/${id}`)
  }

  return { list, getOne, create, update, updateStatus, remove }
}
