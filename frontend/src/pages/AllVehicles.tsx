import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Operator, Vehicle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AllVehicles() {
  const { user } = useAuth()
  const canView = hasPermission(user, 'RESOURCE_MANAGE_ALL') || hasPermission(user, 'RESOURCE_ASSIGN_OWNER')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!canView) {
      navigate('/', { replace: true })
    }
  }, [canView, navigate])

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canView,
  })

  const operatorIds = operators?.map((o) => o.id) ?? []

  const { data: vehicleLists, isLoading } = useQuery({
    queryKey: ['vehicles', 'all', operatorIds],
    queryFn: async () =>
      Promise.all(operatorIds.map((id) => api.get<Vehicle[]>(`/api/operators/${id}/vehicles`).then((r) => r.data))),
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

  if (!canView) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vehicles</h1>
          <p className="text-muted-foreground text-sm">Registered vehicles across all operators.</p>
        </div>
        <Button onClick={() => navigate('/all-vehicles/new')}>
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
                <TableHead>Owner</TableHead>
                <TableHead>Owner Checked In</TableHead>
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {vehicles?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No vehicles yet.
                  </TableCell>
                </TableRow>
              )}
              {vehicles?.map((v) => {
                const owner = operators?.find((o) => o.id === v.operatorId)
                const canViewDetails =
                  hasPermission(user, 'VEHICLE_VIEW_DETAILS') ||
                  hasPermission(user, 'RESOURCE_MANAGE_ALL') ||
                  v.operatorCallsign === user?.callsign
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      {canViewDetails ? (
                        <Link to={`/operators/${v.operatorId}`} className="hover:underline">
                          {v.operatorCallsign}
                        </Link>
                      ) : (
                        'Hidden'
                      )}
                    </TableCell>
                    <TableCell>
                      {owner?.currentCheckIn ? <Badge variant="default">Checked In</Badge> : '—'}
                    </TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>{v.make}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.color || '—'}</TableCell>
                    <TableCell className="font-medium">
                      {canViewDetails ? (
                        <>
                          {v.licensePlateNumber} ({v.licensePlateState})
                        </>
                      ) : (
                        `•••• (${v.licensePlateState})`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {v.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/vehicles/${v.operatorId}/${v.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(v)}>
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
