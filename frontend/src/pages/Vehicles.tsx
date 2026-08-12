import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Operator, Vehicle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function Vehicles() {
  const { user } = useAuth()
  const canManageAll = hasPermission(user, 'RESOURCE_MANAGE_ALL')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<Operator>('/api/auth/me')).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canManageAll,
  })

  const operatorIds = canManageAll ? (operators?.map((o) => o.id) ?? []) : me ? [me.id] : []

  const { data: vehicleLists, isLoading } = useQuery({
    queryKey: ['vehicles', operatorIds],
    queryFn: async () =>
      Promise.all(
        operatorIds.map((id) => api.get<Vehicle[]>(`/api/operators/${id}/vehicles`).then((r) => r.data)),
      ),
    enabled: operatorIds.length > 0,
  })

  const vehicles = vehicleLists?.flat()

  const deleteMutation = useMutation({
    mutationFn: async (v: Vehicle) => api.delete(`/api/operators/${v.operatorId}/vehicles/${v.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Vehicle removed')
    },
    onError: () => toast.error('Failed to delete vehicle'),
  })

  function canManage(v: Vehicle) {
    return canManageAll || v.operatorCallsign === user?.callsign
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vehicles</h1>
          <p className="text-muted-foreground text-sm">
            {canManageAll ? 'Registered operator vehicles.' : 'Your registered vehicles.'}
          </p>
        </div>
        <Button onClick={() => navigate('/vehicles/new')}>
          <Plus className="size-4" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canManageAll && <TableHead>Owner</TableHead>}
                <TableHead>Year</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {vehicles?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No vehicles yet.
                  </TableCell>
                </TableRow>
              )}
              {vehicles?.map((v) => {
                const editable = canManage(v)
                return (
                  <TableRow key={v.id}>
                    {canManageAll && <TableCell>{v.operatorCallsign}</TableCell>}
                    <TableCell>{v.year}</TableCell>
                    <TableCell>{v.make}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.color || '—'}</TableCell>
                    <TableCell className="font-medium">
                      {v.licensePlateNumber} ({v.licensePlateState})
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {v.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        title={editable ? 'Edit vehicle' : 'Not your vehicle'}
                        onClick={() => navigate(`/vehicles/${v.operatorId}/${v.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        title={editable ? 'Delete vehicle' : 'Not your vehicle'}
                        onClick={() => deleteMutation.mutate(v)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
