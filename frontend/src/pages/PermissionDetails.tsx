import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { permissionCatalog } from '@/lib/permissions'
import type { Operator } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const permissionsByModule = permissionCatalog.reduce<Record<string, typeof permissionCatalog>>(
  (groups, permission) => {
    if (!groups[permission.module]) groups[permission.module] = []
    groups[permission.module].push(permission)
    return groups
  },
  {},
)
const moduleNames = Object.keys(permissionsByModule)

export function PermissionDetails() {
  const { user } = useAuth()
  const canView = hasPermission(user, 'OPERATOR_MANAGE_PERMISSIONS')
  const navigate = useNavigate()

  useEffect(() => {
    if (!canView) {
      navigate('/settings', { replace: true })
    }
  }, [canView, navigate])

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canView,
  })

  if (!canView) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Permission Details</h1>
        <p className="text-muted-foreground text-sm">
          What each permission grants, and who currently has it.
        </p>
      </div>

      {moduleNames.map((moduleName) => (
        <Card key={moduleName}>
          <CardHeader>
            <CardTitle className="text-base">{moduleName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {permissionsByModule[moduleName].map((permission) => {
              const holders = (operators ?? []).filter(
                (operator) => operator.admin || operator.permissions.includes(permission.value),
              )
              return (
                <div key={permission.value} className="flex flex-col gap-1.5">
                  <div>
                    <div className="font-medium">{permission.label}</div>
                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                  </div>
                  {holders.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {holders.map((operator) => (
                        <Badge key={operator.id} variant={operator.admin ? 'default' : 'secondary'}>
                          {operator.callsign}
                          {operator.admin ? ' (admin)' : ''}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No operators currently have this permission.</p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
