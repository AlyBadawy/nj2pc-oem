export type Permission =
  | 'OPERATOR_LIST'
  | 'OPERATOR_MANAGE_PERMISSIONS'
  | 'OPERATOR_CREATE'
  | 'INCIDENT_CREATE'
  | 'INCIDENT_VIEW_ALL'
  | 'INCIDENT_EDIT_ALL'
  | 'RESOURCE_TYPE_MANAGE'
  | 'RESOURCE_MANAGE_ALL'
  | 'LOG_VIEW'

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

export interface ResourceType {
  id: number
  name: string
  createdAt: string
}

export interface Resource {
  id: number
  resourceTypeId: number
  resourceTypeName: string
  identifier: string
  serialNumber: string | null
  ownerId: number | null
  ownerCallsign: string | null
  notes: string | null
}

export interface Vehicle {
  id: number
  operatorId: number
  operatorCallsign: string
  year: number
  make: string
  model: string
  color: string | null
  licensePlateNumber: string
  licensePlateState: string
  notes: string | null
  createdAt: string
}

export type AuditEntityType = 'OPERATOR' | 'INCIDENT' | 'RESOURCE' | 'RESOURCE_TYPE' | 'VEHICLE'

export interface AuditLogEntry {
  id: number
  entityType: AuditEntityType
  entityId: number
  action: string
  summary: string
  performedByCallsign: string | null
  performedIp: string | null
  performedAt: string
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
  createdByCallsign: string | null
  canEdit: boolean
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

export interface OperatorRole {
  id: number
  name: string
  createdAt: string
}

export interface OperatorCheckIn {
  id: number
  incidentId: number
  operatorId: number
  operatorCallsign: string
  roleId: number | null
  roleName: string | null
  post: string | null
  checkedInAt: string
  checkedOutAt: string | null
  notes: string | null
}

export interface ResourceCheckIn {
  id: number
  incidentId: number
  resourceId: number
  resourceIdentifier: string
  resourceTypeName: string
  checkedInAt: string
  checkedOutAt: string | null
  notes: string | null
}

export type IncidentPermission = 'VIEW' | 'EDIT'

export interface IncidentPermissionGrant {
  operatorId: number
  operatorCallsign: string
  permission: IncidentPermission
}
