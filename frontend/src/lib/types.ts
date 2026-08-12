export type Permission = 'OPERATOR_LIST' | 'OPERATOR_MANAGE_PERMISSIONS'

export interface AuthResponse {
  token: string
  callsign: string
  name: string
  admin: boolean
  permissions: Permission[]
}

export type OperatorStatus = 'ACTIVE' | 'INACTIVE'

export interface Operator {
  id: number
  callsign: string
  name: string
  licenseClass: string | null
  dmrIds: string[]
  phone: string | null
  email: string | null
  status: OperatorStatus
  notes: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressAttn: string | null
  latitude: string | null
  longitude: string | null
  gridSquare: string | null
  admin: boolean
  hasLoginAccess: boolean
  createdAt: string
  createdByCallsign: string | null
  permissions: Permission[]
}
