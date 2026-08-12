import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { permissionLabels } from '@/lib/permissions'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  )
}

export function OperatorView() {
  const { user } = useAuth()
  const isAdmin = user?.admin ?? false
  const canList = hasPermission(user, 'OPERATOR_LIST')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!canList) {
      navigate('/', { replace: true })
    }
  }, [canList, navigate])

  const { data: operator } = useQuery({
    queryKey: ['operators', id],
    queryFn: async () => (await api.get<Operator>(`/api/operators/${id}`)).data,
    enabled: canList,
  })

  if (!canList || !operator) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {operator.callsign} <span className="text-muted-foreground font-normal">— {operator.name}</span>
          </h1>
          <p className="text-muted-foreground text-sm">Operator profile.</p>
        </div>
        <Button
          disabled={!isAdmin}
          title={isAdmin ? 'Edit operator' : 'Admin only'}
          onClick={() => navigate(`/operators/${id}/edit`)}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Callsign" value={operator.callsign} />
            <Field label="Name" value={operator.name} />
            <Field label="License Class" value={operator.licenseClass ?? ''} />
            <Field label="DMR IDs" value={operator.dmrIds.join(', ')} />
            <Field label="Phone" value={operator.phone ?? ''} />
            <Field label="Email" value={operator.email ?? ''} />
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant={operator.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {operator.status}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Permissions</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {operator.admin && <Badge>Admin</Badge>}
                {operator.permissions.map((p) => (
                  <Badge key={p} variant="secondary">
                    {permissionLabels[p] ?? p}
                  </Badge>
                ))}
                {!operator.admin && operator.permissions.length === 0 && (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
            {isAdmin && <Field label="Created By" value={operator.createdByCallsign ?? 'System'} />}
            {isAdmin && (
              <Field label="Created At" value={new Date(operator.createdAt).toLocaleString()} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address & Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Street" value={operator.addressLine1 ?? ''} />
            <Field label="City, State ZIP" value={operator.addressLine2 ?? ''} />
            <Field label="Attn" value={operator.addressAttn ?? ''} />
            <Field label="Latitude" value={operator.latitude ?? ''} />
            <Field label="Longitude" value={operator.longitude ?? ''} />
            <Field label="Grid Square" value={operator.gridSquare ?? ''} />
          </div>
        </CardContent>
      </Card>

      {operator.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{operator.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
