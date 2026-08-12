import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Operator, Permission } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const permissionOptions: { value: Permission; label: string }[] = [
  { value: 'OPERATOR_LIST', label: 'List Operators' },
  { value: 'OPERATOR_MANAGE_PERMISSIONS', label: 'Manage Permissions' },
]

export function Operators() {
  const { user } = useAuth()
  const isAdmin = user?.admin ?? false
  const canManagePermissions = hasPermission(user, 'OPERATOR_MANAGE_PERMISSIONS')
  const canList = hasPermission(user, 'OPERATOR_LIST')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [permissionsTarget, setPermissionsTarget] = useState<Operator | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])

  useEffect(() => {
    if (!canList) {
      navigate('/', { replace: true })
    }
  }, [canList, navigate])

  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canList,
  })

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

  if (!canList) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Operators</h1>
        <p className="text-muted-foreground text-sm">Registered operator roster.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Callsign</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                {(isAdmin || canManagePermissions) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {operators?.map((op) => (
                <TableRow key={op.id} className="cursor-pointer" onClick={() => navigate(`/operators/${op.id}`)}>
                  <TableCell className="font-medium">{op.callsign}</TableCell>
                  <TableCell>{op.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{op.phone || op.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={op.status === 'ACTIVE' ? 'default' : 'secondary'}>{op.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {op.admin && <Badge>Admin</Badge>}
                    {op.permissions.map((p) => (
                      <Badge key={p} variant="secondary">
                        {permissionOptions.find((o) => o.value === p)?.label ?? p}
                      </Badge>
                    ))}
                    {!op.admin && op.permissions.length === 0 && (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  {(isAdmin || canManagePermissions) && (
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      {canManagePermissions && (
                        <Button variant="ghost" size="icon-sm" onClick={() => openPermissions(op)}>
                          <ShieldCheck className="size-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/operators/${op.id}/edit`)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(op.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!permissionsTarget} onOpenChange={(open) => !open && setPermissionsTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>{permissionsTarget?.callsign}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {permissionOptions.map((option) => (
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
