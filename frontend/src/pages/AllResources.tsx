import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Resource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AllResources() {
  const { user } = useAuth()
  const canView = hasPermission(user, 'RESOURCE_MANAGE_ALL') || hasPermission(user, 'RESOURCE_ASSIGN_OWNER')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!canView) {
      navigate('/', { replace: true })
    }
  }, [canView, navigate])

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
    enabled: canView,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment removed')
    },
    onError: () => toast.error('Failed to delete equipment'),
  })

  if (!canView) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gear & Equipment</h1>
          <p className="text-muted-foreground text-sm">Radios, repeaters, and equipment across all operators.</p>
        </div>
        <Button onClick={() => navigate('/all-resources/new')}>
          <Plus className="size-4" />
          Add Equipment
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
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Serial Number</TableHead>
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
                    No equipment yet.
                  </TableCell>
                </TableRow>
              )}
              {resources?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.ownerId ? (
                      <Link to={`/operators/${r.ownerId}`} className="hover:underline">
                        {r.ownerCallsign}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{r.resourceTypeName}</TableCell>
                  <TableCell className="font-medium">{r.identifier}</TableCell>
                  <TableCell>{r.serialNumber || '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[240px] truncate">
                    {r.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/resources/${r.id}/edit`)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
