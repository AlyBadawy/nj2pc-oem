import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { ResourceType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ResourceTypes() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'RESOURCE_TYPE_MANAGE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!canManage) {
      navigate('/resources', { replace: true })
    }
  }, [canManage, navigate])

  const { data: resourceTypes, isLoading } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
    enabled: canManage,
  })

  const createMutation = useMutation({
    mutationFn: async () => api.post('/api/resource-types', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Resource type added')
      setName('')
    },
    onError: () => toast.error('Failed to add resource type'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      api.put(`/api/resource-types/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Resource type updated')
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update resource type'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/resource-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Resource type removed')
    },
    onError: () => toast.error('Failed to remove resource type'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  function startEdit(type: ResourceType) {
    setEditingId(type.id)
    setEditName(type.name)
  }

  if (!canManage) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Resource Types</h1>
        <p className="text-muted-foreground text-sm">
          Categories available when adding a resource.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Resource Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {resourceTypes?.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">
                    {editingId === type.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 max-w-xs"
                        autoFocus
                      />
                    ) : (
                      type.name
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {editingId === type.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!editName.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: type.id, name: editName })}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(type)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteMutation.mutate(type.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Resource Type</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resourceTypeName">New resource type</Label>
              <Input
                id="resourceTypeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Radio"
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="size-4" />
              Add Resource Type
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
