export type Permission =
  | 'OPERATOR_LIST'
  | 'OPERATOR_MANAGE_PERMISSIONS'
  | 'OPERATOR_CREATE'
  | 'OPERATOR_EDIT'
  | 'OPERATOR_VIEW_CONTACT'
  | 'INCIDENT_CREATE'
  | 'INCIDENT_VIEW_ALL'
  | 'INCIDENT_EDIT_ALL'
  | 'RESOURCE_TYPE_MANAGE'
  | 'RESOURCE_MANAGE_ALL'
  | 'RESOURCE_ASSIGN_OWNER'
  | 'VEHICLE_VIEW_DETAILS'
  | 'OPERATOR_ROLE_MANAGE'
  | 'LOG_VIEW'
  | 'COMMS_PLAN_MANAGE'

export interface AuthResponse {
  token: string
  callsign: string
  name: string
  admin: boolean
  permissions: Permission[]
}

export type OperatorStatus = 'ACTIVE' | 'INACTIVE'

export interface OperatorCurrentCheckIn {
  incidentId: number
  incidentName: string
  roleName: string | null
  roleColor: string | null
  roleAccessLevel: string | null
  post: string | null
  checkedInAt: string
}

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
  photoUrl: string | null
  currentCheckIn: OperatorCurrentCheckIn | null
  licensePlate: string | null
}

export type ResourceFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT'

export interface ResourceTypeField {
  id: number
  name: string
  fieldType: ResourceFieldType
  required: boolean
  sortOrder: number
  options: string[] | null
}

export interface ResourceType {
  id: number
  name: string
  createdAt: string
  fields: ResourceTypeField[]
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
  customFields: Record<string, unknown>
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

export type AuditEntityType =
  | 'OPERATOR'
  | 'INCIDENT'
  | 'RESOURCE'
  | 'RESOURCE_TYPE'
  | 'VEHICLE'
  | 'COMMS_PLAN'
  | 'OPERATOR_ROLE'

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
  color: string
  accessLevel: string
  sortOrder: number
  createdAt: string
}

export interface OperatorCheckIn {
  id: number
  incidentId: number
  operatorId: number
  operatorCallsign: string
  roleId: number | null
  roleName: string | null
  roleColor: string | null
  roleAccessLevel: string | null
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
  latitude: string | null
  longitude: string | null
}

export type IncidentPermission = 'VIEW' | 'EDIT'

export interface IncidentPermissionGrant {
  operatorId: number
  operatorCallsign: string
  permission: IncidentPermission
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
  version: number
  rootPlanId: number
  active: boolean
}

export interface IncidentCommsPlanApplication {
  id: number
  communicationPlanId: number
  planName: string
  planVersion: number
  appliedAt: string
  appliedByCallsign: string | null
  revokedAt: string | null
  revokedByCallsign: string | null
}
