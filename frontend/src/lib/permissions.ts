import type { Permission } from '@/lib/types'

export const permissionCatalog: { value: Permission; label: string; description: string; module: string }[] = [
  {
    value: 'OPERATOR_LIST',
    label: 'List Operators',
    description: 'View the operator roster.',
    module: 'Operators',
  },
  {
    value: 'OPERATOR_MANAGE_PERMISSIONS',
    label: 'Manage Permissions',
    description: "Grant or revoke other operators' permissions.",
    module: 'Operators',
  },
  {
    value: 'OPERATOR_CREATE',
    label: 'Create Operators',
    description: 'Register new operators.',
    module: 'Operators',
  },
  {
    value: 'OPERATOR_VIEW_CONTACT',
    label: 'View Contact Info',
    description: "See other operators' phone number and email.",
    module: 'Operators',
  },
  {
    value: 'INCIDENT_CREATE',
    label: 'Create Incidents',
    description: 'Create new incidents.',
    module: 'Incidents',
  },
  {
    value: 'INCIDENT_VIEW_ALL',
    label: 'View All Incidents',
    description: 'See every incident, regardless of per-incident access or check-in status.',
    module: 'Incidents',
  },
  {
    value: 'INCIDENT_EDIT_ALL',
    label: 'Edit All Incidents',
    description: 'Edit, start, end, and manage check-ins on any incident.',
    module: 'Incidents',
  },
  {
    value: 'RESOURCE_TYPE_MANAGE',
    label: 'Manage Equipment Types',
    description: 'Create, edit, and delete equipment types.',
    module: 'Gear & Equipment',
  },
  {
    value: 'RESOURCE_MANAGE_ALL',
    label: 'Manage All Gear & Equipment',
    description: "Manage any operator's gear, equipment, and vehicles, not just your own.",
    module: 'Gear & Equipment',
  },
  {
    value: 'RESOURCE_ASSIGN_OWNER',
    label: 'Add Gear & Equipment for Others',
    description:
      'Register gear, equipment, or vehicles on behalf of another operator, without full manage-all access.',
    module: 'Gear & Equipment',
  },
  {
    value: 'VEHICLE_VIEW_DETAILS',
    label: 'View Vehicle Details',
    description: "See other operators' full vehicle details (license plate, owner) in the vehicles list.",
    module: 'Gear & Equipment',
  },
  {
    value: 'OPERATOR_ROLE_MANAGE',
    label: 'Manage Check-In Roles',
    description: 'Create, edit, and delete the roles operators can be checked in as, including their color and access level.',
    module: 'Roles',
  },
  {
    value: 'LOG_VIEW',
    label: 'View Audit Log',
    description: 'View the global and per-entity audit log.',
    module: 'Audit Log',
  },
  {
    value: 'COMMS_PLAN_MANAGE',
    label: 'Manage Comms Plans',
    description: 'Create, edit, and delete ICS-205 communications plans and their channels.',
    module: 'Communications',
  },
]

export const permissionLabels: Record<Permission, string> = Object.fromEntries(
  permissionCatalog.map((p) => [p.value, p.label]),
) as Record<Permission, string>

export const permissionsByModule: Record<string, typeof permissionCatalog> = permissionCatalog.reduce(
  (groups, permission) => {
    if (!groups[permission.module]) groups[permission.module] = []
    groups[permission.module].push(permission)
    return groups
  },
  {} as Record<string, typeof permissionCatalog>,
)

export const permissionModuleNames = Object.keys(permissionsByModule)
