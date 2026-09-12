interface ElectronicSignData {
  certificado_p12_base64: string
  clave_certificado: string
}

export function useElectronicSign() {
  const { get, put } = useApi('auth')

  async function fetchSign(profileId: string): Promise<ElectronicSignData | null> {
    try {
      const res = await get<ElectronicSignData>(`/profiles/${profileId}/electronic-sign`)
      return (res as unknown as { data: ElectronicSignData }).data ?? null
    } catch {
      return null
    }
  }

  async function save(profileId: string, certificadoP12Base64: string, claveCertificado: string): Promise<void> {
    await put(`/profiles/${profileId}/electronic-sign`, {
      certificado_p12_base64: certificadoP12Base64,
      clave_certificado: claveCertificado,
    })
  }

  return { fetchSign, save }
}
