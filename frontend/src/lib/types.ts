export type Role = 'ADMIN' | 'OPERATOR'

export interface AuthResponse {
  token: string
  username: string
  role: Role
}

export type OperatorStatus = 'ACTIVE' | 'INACTIVE'

export interface Operator {
  id: number
  callsign: string
  firstName: string
  lastName: string
  licenseClass: string | null
  phone: string | null
  email: string | null
  status: OperatorStatus
  notes: string | null
  createdAt: string
}

export type IncidentStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'

export interface Incident {
  id: number
  name: string
  location: string | null
  status: IncidentStatus
  startTime: string | null
  endTime: string | null
  description: string | null
  createdAt: string
}

export type Priority = 'ROUTINE' | 'PRIORITY' | 'EMERGENCY'

export interface IncidentLog {
  id: number
  incidentId: number
  operatorId: number | null
  operatorCallsign: string | null
  toOperatorId: number | null
  toOperatorCallsign: string | null
  subject: string
  message: string
  priority: Priority
  loggedAt: string
}

export type ResourceType = 'RADIO' | 'REPEATER' | 'EQUIPMENT'
export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE'

export interface Resource {
  id: number
  type: ResourceType
  identifier: string
  frequency: string | null
  status: ResourceStatus
  assignedOperatorId: number | null
  assignedOperatorCallsign: string | null
  assignedIncidentId: number | null
  assignedIncidentName: string | null
  notes: string | null
}
