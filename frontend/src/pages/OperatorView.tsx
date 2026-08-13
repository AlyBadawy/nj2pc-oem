import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Printer, Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiUrl } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { permissionLabels } from '@/lib/permissions'
import { credentialNoFor, incidentRef, type OperatorIdentityData } from '@/lib/identity'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperatorIdentity } from '@/components/identity/OperatorIdentity'

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
  const canViewContact = hasPermission(user, 'OPERATOR_VIEW_CONTACT')
  const canEditOperator = hasPermission(user, 'OPERATOR_EDIT')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const canManagePhoto = isAdmin || operator?.callsign === user?.callsign

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/api/operators/${id}/photo`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', id] })
      toast.success('Photo updated')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to upload photo'
      toast.error(message)
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async () => api.delete(`/api/operators/${id}/photo`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', id] })
      toast.success('Photo removed')
    },
    onError: () => toast.error('Failed to remove photo'),
  })

  if (!canList || !operator) return null

  const identity: OperatorIdentityData = {
    id: operator.id,
    callsign: operator.callsign,
    name: operator.name,
    licenseClass: operator.licenseClass,
    role: operator.currentCheckIn?.roleName ?? null,
    roleColor: operator.currentCheckIn?.roleColor ?? null,
    roleAccessLevel: operator.currentCheckIn?.roleAccessLevel ?? null,
    canViewContact: canViewContact || operator.callsign === user?.callsign,
    phone: operator.phone,
    email: operator.email,
    licensePlate: operator.licensePlate,
    photoUrl: operator.photoUrl ? apiUrl(operator.photoUrl) : null,
    credentialNo: credentialNoFor(operator.id),
    incident: operator.currentCheckIn
      ? {
          id: operator.currentCheckIn.incidentId,
          name: operator.currentCheckIn.incidentName,
          ref: incidentRef(operator.currentCheckIn.incidentId, operator.currentCheckIn.checkedInAt),
        }
      : null,
    checkedInAt: operator.currentCheckIn?.checkedInAt ?? null,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {operator.callsign} <span className="text-muted-foreground font-normal">— {operator.name}</span>
          </h1>
          <p className="text-muted-foreground text-sm">Operator credential.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button
            disabled={!canEditOperator}
            title={canEditOperator ? 'Edit operator' : 'Requires Edit Operators permission'}
            onClick={() => navigate(`/operators/${id}/edit`)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      <div id="credential-print-root" className="bg-credential-paper-edge p-6 rounded-lg print:p-0 print:bg-transparent">
        <OperatorIdentity variant="credential" data={identity} />
        {canManagePhoto && (
          <div className="mt-3 flex items-center gap-2 print:hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPhotoMutation.mutate(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadPhotoMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {operator.photoUrl ? 'Replace Photo' : 'Upload Photo'}
            </Button>
            {operator.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                disabled={deletePhotoMutation.isPending}
                onClick={() => deletePhotoMutation.mutate()}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <Field label="DMR IDs" value={operator.dmrIds.join(', ')} />
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
