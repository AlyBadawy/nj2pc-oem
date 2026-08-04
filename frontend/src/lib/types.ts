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
  createdAt: string
}

export type IncidentStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'

export interface Incident {
  id: number
  name: string
  location: string | null
  status: IncidentStatus
  plannedStartTime: string | null
  plannedEndTime: string | null
  actualStartTime: string | null
  actualEndTime: string | null
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

export type ChannelMode = 'ANALOG' | 'DIGITAL' | 'MIXED'

export interface CommunicationChannel {
  id: number
  planId: number
  zoneGroup: string
  channelNumber: number
  function: string
  channelName: string
  assignment: string | null
  rxFrequency: string | null
  rxTone: string | null
  txFrequency: string | null
  txTone: string | null
  mode: ChannelMode
  remarks: string | null
}

export interface CommunicationPlanIncidentSummary {
  id: number
  name: string
}

export interface CommunicationPlan {
  id: number
  name: string
  operationalPeriodStart: string | null
  operationalPeriodEnd: string | null
  specialInstructions: string | null
  preparedByName: string | null
  preparedByCallsign: string | null
  preparedAt: string | null
  approvedByName: string | null
  approvedByCallsign: string | null
  approvedAt: string | null
  createdAt: string
  incidents: CommunicationPlanIncidentSummary[]
}

export interface OperatorCheckIn {
  id: number
  incidentId: number
  operatorId: number
  operatorCallsign: string
  checkedInAt: string
  checkedOutAt: string | null
  notes: string | null
}

export interface ResourceCheckIn {
  id: number
  incidentId: number
  resourceId: number
  resourceIdentifier: string
  resourceType: ResourceType
  checkedInAt: string
  checkedOutAt: string | null
  notes: string | null
}
