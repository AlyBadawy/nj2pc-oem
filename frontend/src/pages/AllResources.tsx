import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Resource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL_TYPES = 'all-types'
const ALL_OWNERS = 'all-owners'

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

  const [typeFilter, setTypeFilter] = useState(ALL_TYPES)
  const [ownerFilter, setOwnerFilter] = useState(ALL_OWNERS)

  const types = useMemo(() => {
    const map = new Map<number, string>()
    resources?.forEach((r) => map.set(r.resourceTypeId, r.resourceTypeName))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [resources])

  const owners = useMemo(() => {
    const map = new Map<number, string>()
    resources?.forEach((r) => {
      if (r.ownerId) map.set(r.ownerId, r.ownerCallsign ?? String(r.ownerId))
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [resources])

  const filteredResources = useMemo(() => {
    return resources?.filter((r) => {
      if (typeFilter !== ALL_TYPES && String(r.resourceTypeId) !== typeFilter) return false
      if (ownerFilter !== ALL_OWNERS && String(r.ownerId) !== ownerFilter) return false
      return true
    })
  }, [resources, typeFilter, ownerFilter])

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
          <div className="flex gap-3 pt-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {types.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OWNERS}>All owners</SelectItem>
                {owners.map(([id, callsign]) => (
                  <SelectItem key={id} value={String(id)}>
                    {callsign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Deployment Location</TableHead>
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
              {filteredResources?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No equipment matches these filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredResources?.map((r) => (
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
                  <TableCell className="font-medium">{r.identifier}</TableCell>
                  <TableCell>{r.resourceTypeName}</TableCell>
                  <TableCell>{r.lastDeploymentLocationName || '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[240px] truncate">
                    {r.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/resources/${r.id}`)}>
                      <Eye className="size-4" />
                    </Button>
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
