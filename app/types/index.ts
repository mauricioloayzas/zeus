export interface User {
  id: string
  email: string
  name: string
  country_id: string
  language_id: string
  time_zone_id: string
  createdAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  next_cursor?: string | null
  has_more?: boolean
}

// 'service' = perfil raíz/"origin" de una app (ver ProfileTypes::SERVICE en bob-construye —
// no confundir con el caso ORIGIN del enum, que no se usa para esto). Es el único tipo de
// perfil que da acceso a Zeus.
export type ProfileType = 'service' | 'contador' | 'company' | 'person' | 'factory' | 'house' | 'worker' | 'child' | 'client'

export interface Profile {
  id: string
  name: string
  email?: string
  type: ProfileType
  url_name: string
  country_id: string
  currency_id: string
  parent_id?: string | null
  tax_id?: string | null
  tax_id_type?: string | null
  phone?: string | null
  status?: string
}

export interface ProfileForm {
  name: string
  email: string
  type: Exclude<ProfileType, 'service'>
  country_id: string
  currency_id: string
}

export interface Rbac {
  id: string
  profile_id: string
  application_id: string
  role_id: string
  user_id: string
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  description: string
}

export interface Application {
  id: string
  name: string
  description: string
  active: boolean
  created_at: string
  recaptcha_secret_key?: string | null
}

export interface ApplicationForm {
  name: string
  description?: string
  active?: boolean
}

export interface Plan {
  id: string
  profile_id: string
  application_id: string
  type: string
  name: string
  description: string
  price: number
  status: string
  created_at: string
  updated_at: string | null
}

export interface PlanForm {
  application_id: string
  type: string
  name: string
  description: string
  price: number
}

export interface Subscription {
  id: string
  plan_id: string
  profile_id: string
  application_id: string
  payment_method_id: string | null
  start_date: string
  end_date: string
  next_billing_date: string | null
  created_by: string
  status: string
  amount: number
  is_trial: boolean
  created_at: string
  updated_at: string | null
}

export interface SubscriptionStatusForm {
  status: string
}

export interface Factura {
  id: string
  profile_id: string
  application_id: string
  tipo_comprobante: string
  estado: string
  clave_acceso: string
  numero_autorizacion: string
  fecha_autorizacion: string | null
  info_tributaria: {
    razonSocial: string
    ruc?: string
    secuencial?: string
    estab: string
    ptoEmi: string
  }
  info_factura: {
    fechaEmision: string
    razonSocialComprador: string
    identificacionComprador: string
    importeTotal: number
    moneda: string
  }
  info_adicional: Record<string, string>
  created_at: string
  updated_at: string | null
}

export type CuentaContableTipo = 'asset' | 'liability' | 'equity' | 'income' | 'cost' | 'expense'
export type CuentaContableNaturaleza = 'debit' | 'credit'

export interface CuentaContableProfile {
  id: string
  profile_id: string
  codigo: string
  nombre: string
  tipo: CuentaContableTipo
  naturaleza: CuentaContableNaturaleza
  tipo_estado: 1 | 2
  status: string
  es_detalle: boolean
  saldo: number
  descripcion: string
  parent_id: string | null
  created_at: string
  updated_at: string | null
}

export interface CuentaContableInitResult {
  already_initialized: boolean
  cuentas: number
  base_cuentas?: number
  success?: boolean
}

export interface MayorContable {
  id: string
  cuenta_id: string
  debe: number
  haber: number
  saldo: number
  anio: string
  mes: string
  created_at: string
  updated_at: string
}

export type WhatsAppAccountStatus = 'connected' | 'disconnected'
export type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
export type WhatsAppTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'

export interface WhatsAppAccount {
  id: string
  profile_id: string
  waba_id: string
  phone_number_id: string
  business_id: string | null
  display_phone_number: string | null
  verified_name: string | null
  status: WhatsAppAccountStatus
  connected_at: string
  updated_at: string | null
  is_coexistence: boolean
}

export interface WhatsAppTemplate {
  id: string
  profile_id: string
  waba_id: string
  meta_template_id: string | null
  name: string
  language: string
  category: WhatsAppTemplateCategory
  body_text: string
  variables_example: string[]
  has_document_header: boolean
  status: WhatsAppTemplateStatus
  rejected_reason: string | null
  created_at: string
  updated_at: string | null
}

export interface WhatsAppTemplateForm {
  name: string
  language: string
  category: WhatsAppTemplateCategory
  body_text: string
  variables_example: string[]
  header_document_base64?: string
  header_document_mime_type?: string
  header_document_filename?: string
}

export type Regimen = '0' | '1' | '2' | '3'

export interface Contribuyente {
  profile_id: string
  nombre_comercial?: string | null
  direccion_matriz?: string | null
  regimen?: Regimen | null
  contribuyente_especial?: string | null
  obligado_contabilidad?: string | null
  created_at: string
  updated_at: string | null
}

export interface ContribuyenteForm {
  nombre_comercial?: string
  direccion_matriz?: string
  regimen?: Regimen
  contribuyente_especial?: string
  obligado_contabilidad?: string
}

export type EstadoDocumento = 'borrador' | 'generado' | 'firmado' | 'enviado' | 'autorizado' | 'rechazado' | 'anulado'
export type TipoIdentificacion = '04' | '05' | '06' | '07' | '09'
export type EstadoProforma = 'activa' | 'convertida' | 'anulada'

export interface Proforma {
  id: string
  profile_id: string
  numero: string
  estado: EstadoProforma
  fecha_emision: string
  tipo_identificacion: TipoIdentificacion
  identificacion: string
  razon_social: string
  importeTotal: number
  moneda: string
  created_at: string
}

export interface NotaCredito {
  id: string
  profile_id: string
  estado: EstadoDocumento
  info_tributaria: { estab: string, ptoEmi: string, secuencial?: string }
  info_nota_credito: {
    fechaEmision: string
    razonSocialComprador: string
    identificacionComprador: string
    valorModificacion: number
    moneda: string
  }
  created_at: string
}

export interface NotaDebito {
  id: string
  profile_id: string
  estado: EstadoDocumento
  info_tributaria: { estab: string, ptoEmi: string, secuencial?: string }
  info_nota_debito: {
    fechaEmision: string
    razonSocialComprador: string
    identificacionComprador: string
    valorTotal: number
  }
  created_at: string
}

export interface GuiaRemision {
  id: string
  profile_id: string
  estado: EstadoDocumento
  info_tributaria: { estab: string, ptoEmi: string, secuencial?: string }
  info_guia_remision: {
    fechaIniTransporte: string
    fechaFinTransporte: string
    placa: string
  }
  destinatarios: { razonSocialDestinatario: string, identificacionDestinatario: string }[]
  created_at: string
}

export interface ComprobanteRetencion {
  id: string
  profile_id: string
  estado: EstadoDocumento
  info_tributaria: { estab: string, ptoEmi: string, secuencial?: string }
  info_comp_retencion: {
    fechaEmision: string
    razonSocialSujetoRetenido: string
    identificacionSujetoRetenido: string
    periodoFiscal: string
  }
  impuestos: { valorRetenido: number }[]
  created_at: string
}

export interface LiquidacionCompra {
  id: string
  profile_id: string
  estado: EstadoDocumento
  info_tributaria: { estab: string, ptoEmi: string, secuencial?: string }
  info_liquidacion_compra: {
    fechaEmision: string
    razonSocialProveedor: string
    identificacionProveedor: string
    importeTotal: number
    moneda: string
  }
  created_at: string
}

export type PuntoEmisionStatus = 'active' | 'inactive'

export interface PuntoEmision {
  id: string
  profile_id: string
  estab: string
  pto_emi: string
  estab_pto_emi: string
  warehouse_id?: string | null
  descripcion?: string | null
  status: PuntoEmisionStatus
  created_at: string
  updated_at: string | null
}

export interface PuntoEmisionForm {
  estab?: string
  pto_emi?: string
  descripcion?: string | null
  status?: PuntoEmisionStatus
}
