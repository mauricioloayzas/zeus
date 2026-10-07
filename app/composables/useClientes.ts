import type { ApiResponse, Cliente, ClienteForm } from '~/types'

export function useClientes() {
  const { get, post, patch, del } = useApi('caja')

  async function list(profileId: string): Promise<Cliente[]> {
    const res = await get<Cliente[]>(`/profiles/${profileId}/clientes`)
    return res.data ?? []
  }

  async function listPaged(profileId: string, cursor: string | null = null, limit = 20, search: string | null = null): Promise<ApiResponse<Cliente[]>> {
    return get<Cliente[]>(`/profiles/${profileId}/clientes`, { limit, cursor: cursor ?? undefined, search: search ?? undefined })
  }

  async function create(profileId: string, data: ClienteForm): Promise<Cliente> {
    const res = await post<Cliente>(`/profiles/${profileId}/clientes`, data)
    return res.data
  }

  async function update(profileId: string, id: string, data: Partial<ClienteForm>): Promise<Cliente> {
    const res = await patch<Cliente>(`/profiles/${profileId}/clientes/${id}`, data)
    return res.data
  }

  async function remove(profileId: string, id: string): Promise<void> {
    await del(`/profiles/${profileId}/clientes/${id}`)
  }

  return { list, listPaged, create, update, remove }
}
