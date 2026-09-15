import type { AsientoContable, AsientoContableLineaForm } from '~/types'

export function useAsientosContables() {
  const { get, post, del } = useApi('yupana')

  async function list(profileId: string): Promise<AsientoContable[]> {
    const res = await get<AsientoContable[]>(`/perfiles/${profileId}/asientos`)
    return (res as unknown as { data: AsientoContable[] }).data ?? []
  }

  async function getOne(profileId: string, id: string): Promise<AsientoContable> {
    const res = await get<AsientoContable>(`/perfiles/${profileId}/asientos/${id}`)
    return (res as unknown as { data: AsientoContable }).data
  }

  async function create(profileId: string, data: { fecha: string, descripcion: string, entries: AsientoContableLineaForm[] }): Promise<AsientoContable> {
    const res = await post<AsientoContable>(`/perfiles/${profileId}/asientos`, data)
    return (res as unknown as { data: AsientoContable }).data
  }

  async function remove(profileId: string, id: string): Promise<void> {
    await del(`/perfiles/${profileId}/asientos/${id}`)
  }

  return { list, getOne, create, remove }
}
