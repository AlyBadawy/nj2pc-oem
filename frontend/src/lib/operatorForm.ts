import type { OperatorStatus, Permission } from '@/lib/types'

export type OperatorFormState = {
  callsign: string
  name: string
  licenseClass: string
  dmrIds: string[]
  phone: string
  email: string
  status: OperatorStatus
  notes: string
  addressLine1: string
  addressLine2: string
  addressAttn: string
  latitude: string
  longitude: string
  gridSquare: string
  password: string
  permissions: Permission[]
}

export const emptyOperatorForm: OperatorFormState = {
  callsign: '',
  name: '',
  licenseClass: '',
  dmrIds: [],
  phone: '',
  email: '',
  status: 'ACTIVE',
  notes: '',
  addressLine1: '',
  addressLine2: '',
  addressAttn: '',
  latitude: '',
  longitude: '',
  gridSquare: '',
  password: '',
  permissions: [],
}
