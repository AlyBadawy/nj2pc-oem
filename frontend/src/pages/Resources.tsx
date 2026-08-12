import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Resource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function Resources() {
  const { user } = useAuth()
  const canManageAll = hasPermission(user, 'RESOURCE_MANAGE_ALL')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: allResources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const resources = canManageAll
    ? allResources
    : allResources?.filter((r) => r.ownerCallsign === user?.callsign)

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource removed')
    },
    onError: () => toast.error('Failed to delete resource'),
  })

  function canManage(r: Resource) {
    return canManageAll || r.ownerCallsign === user?.callsign
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-muted-foreground text-sm">
            {canManageAll ? 'Radios, repeaters, and equipment.' : 'Your radios, repeaters, and equipment.'}
          </p>
        </div>
        <Button onClick={() => navigate('/resources/new')}>
          <Plus className="size-4" />
          Add Resource
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Serial Number</TableHead>
                {canManageAll && <TableHead>Owner</TableHead>}
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
              {resources?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No resources yet.
                  </TableCell>
                </TableRow>
              )}
              {resources?.map((r) => {
                const editable = canManage(r)
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.resourceTypeName}</TableCell>
                    <TableCell className="font-medium">{r.identifier}</TableCell>
                    <TableCell>{r.serialNumber || '—'}</TableCell>
                    {canManageAll && <TableCell>{r.ownerCallsign || '—'}</TableCell>}
                    <TableCell className="text-muted-foreground max-w-[240px] truncate">
                      {r.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        title={editable ? 'Edit resource' : 'Not your resource'}
                        onClick={() => navigate(`/resources/${r.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        title={editable ? 'Delete resource' : 'Not your resource'}
                        onClick={() => deleteMutation.mutate(r.id)}
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
