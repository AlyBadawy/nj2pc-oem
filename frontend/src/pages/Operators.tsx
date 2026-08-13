import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, ShieldCheck, UserPlus, LayoutGrid, TableIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiUrl } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { permissionCatalog } from '@/lib/permissions'
import { credentialNoFor, incidentRef, type OperatorIdentityData } from '@/lib/identity'
import type { Operator, Permission } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OperatorIdentity, RosterHeader } from '@/components/identity/OperatorIdentity'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ViewMode = 'cards' | 'table'

export function Operators() {
  const { user } = useAuth()
  const isAdmin = user?.admin ?? false
  const canManagePermissions = hasPermission(user, 'OPERATOR_MANAGE_PERMISSIONS')
  const canViewContact = hasPermission(user, 'OPERATOR_VIEW_CONTACT')
  const canList = hasPermission(user, 'OPERATOR_LIST')
  const canCreate = hasPermission(user, 'OPERATOR_CREATE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewMode>('cards')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [permissionsTarget, setPermissionsTarget] = useState<Operator | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])

  useEffect(() => {
    if (!canList) {
      navigate('/', { replace: true })
    }
  }, [canList, navigate])

  const { data, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canList,
  })

  const operators = useMemo(
    () => (data ? [...data].sort((a, b) => a.callsign.localeCompare(b.callsign)) : data),
    [data],
  )

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator removed')
    },
    onError: () => toast.error('Failed to delete operator'),
  })

  const permissionsMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/operators/${permissionsTarget?.id}/permissions`, { permissions: selectedPermissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Permissions updated')
      setPermissionsTarget(null)
    },
    onError: () => toast.error('Failed to update permissions'),
  })

  function openPermissions(operator: Operator) {
    setPermissionsTarget(operator)
    setSelectedPermissions(operator.permissions)
  }

  function toIdentity(op: Operator): OperatorIdentityData {
    return {
      id: op.id,
      callsign: op.callsign,
      name: op.name,
      licenseClass: op.licenseClass,
      role: op.currentCheckIn?.roleName ?? null,
      roleColor: op.currentCheckIn?.roleColor ?? null,
      roleAccessLevel: op.currentCheckIn?.roleAccessLevel ?? null,
      canViewContact: canViewContact || op.callsign === user?.callsign,
      phone: op.phone,
      email: op.email,
      photoUrl: op.photoUrl ? apiUrl(op.photoUrl) : null,
      credentialNo: credentialNoFor(op.id),
      incident: op.currentCheckIn
        ? {
            id: op.currentCheckIn.incidentId,
            name: op.currentCheckIn.incidentName,
            ref: incidentRef(op.currentCheckIn.incidentId, op.currentCheckIn.checkedInAt),
          }
        : null,
      checkedInAt: op.currentCheckIn?.checkedInAt ?? null,
    }
  }

  if (!canList) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operators</h1>
          <p className="text-muted-foreground text-sm">Registered operator roster.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button variant={view === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setView('cards')}>
              <LayoutGrid className="size-4" />
              Cards
            </Button>
            <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setView('table')}>
              <TableIcon className="size-4" />
              Table
            </Button>
          </div>
          <Button
            disabled={!canCreate}
            title={canCreate ? 'Register operator' : 'Requires Create Operators permission'}
            onClick={() => navigate('/operators/new')}
          >
            <UserPlus className="size-4" />
            Register Operator
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && operators?.length === 0 && <p className="text-muted-foreground text-sm">No operators yet.</p>}

      {view === 'cards' ? (
        <div className="flex flex-wrap gap-6">
          {operators?.map((op) => (
            <div
              key={op.id}
              role="link"
              tabIndex={0}
              className="w-full max-w-[544px] cursor-pointer sm:w-[544px]"
              onClick={() => navigate(`/operators/${op.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/operators/${op.id}`)
              }}
            >
              <OperatorIdentity variant="credential" data={toIdentity(op)} />
            </div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0 gap-0">
          <RosterHeader />
          <CardContent className="p-0">
            {operators?.map((op) => (
              <div key={op.id} className="group">
                <OperatorIdentity
                  variant="row"
                  data={toIdentity(op)}
                  expanded={expandedId === op.id}
                  onToggle={() => setExpandedId(expandedId === op.id ? null : op.id)}
                />
                {expandedId === op.id && (isAdmin || canManagePermissions) && (
                  <div
                    className="flex justify-end gap-1 border-b border-black/10 bg-credential-blue-tint px-3 pb-2.5"
                    style={{ boxShadow: 'inset 3px 0 0 var(--credential-blue)' }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canManagePermissions}
                      title={canManagePermissions ? 'Manage permissions' : 'Requires Manage Permissions'}
                      onClick={() => openPermissions(op)}
                    >
                      <ShieldCheck className="size-4" />
                      Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!isAdmin}
                      title={isAdmin ? 'Edit operator' : 'Admin only'}
                      onClick={() => navigate(`/operators/${op.id}/edit`)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!isAdmin}
                      title={isAdmin ? 'Delete operator' : 'Admin only'}
                      onClick={() => deleteMutation.mutate(op.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!permissionsTarget} onOpenChange={(open) => !open && setPermissionsTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>{permissionsTarget?.callsign}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {permissionCatalog.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(option.value)}
                  onChange={(e) =>
                    setSelectedPermissions(
                      e.target.checked
                        ? [...selectedPermissions, option.value]
                        : selectedPermissions.filter((p) => p !== option.value),
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsTarget(null)}>
              Cancel
            </Button>
            <Button disabled={permissionsMutation.isPending} onClick={() => permissionsMutation.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
