import type { Permission } from '@/lib/types'

export const permissionCatalog: { value: Permission; label: string; description: string }[] = [
  { value: 'OPERATOR_LIST', label: 'List Operators', description: 'View the operator roster.' },
  {
    value: 'OPERATOR_MANAGE_PERMISSIONS',
    label: 'Manage Permissions',
    description: "Grant or revoke other operators' permissions.",
  },
  { value: 'OPERATOR_CREATE', label: 'Create Operators', description: 'Register new operators.' },
  { value: 'INCIDENT_CREATE', label: 'Create Incidents', description: 'Create new incidents.' },
  {
    value: 'INCIDENT_VIEW_ALL',
    label: 'View All Incidents',
    description: 'See every incident, regardless of per-incident access or check-in status.',
  },
  {
    value: 'INCIDENT_EDIT_ALL',
    label: 'Edit All Incidents',
    description: 'Edit, start, end, and manage check-ins on any incident.',
  },
  {
    value: 'RESOURCE_TYPE_MANAGE',
    label: 'Manage Resource Types',
    description: 'Create, edit, and delete resource types.',
  },
  {
    value: 'RESOURCE_MANAGE_ALL',
    label: 'Manage All Resources',
    description: "Manage any operator's resources and vehicles, not just your own.",
  },
  { value: 'LOG_VIEW', label: 'View Audit Log', description: 'View the global and per-entity audit log.' },
]

export const permissionLabels: Record<Permission, string> = Object.fromEntries(
  permissionCatalog.map((p) => [p.value, p.label]),
) as Record<Permission, string>
