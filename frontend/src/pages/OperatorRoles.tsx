import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { OperatorRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type EditState = {
  name: string
  color: string
  accessLevel: string
}

const emptyEdit: EditState = { name: '', color: '#6B7280', accessLevel: '' }

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-3.5 shrink-0 rounded-full border border-black/20"
      style={{ background: color }}
    />
  )
}

export function OperatorRoles() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'OPERATOR_ROLE_MANAGE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [newRole, setNewRole] = useState<EditState>(emptyEdit)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState<EditState>(emptyEdit)

  useEffect(() => {
    if (!canManage) {
      navigate('/settings', { replace: true })
    }
  }, [canManage, navigate])

  const { data: roles, isLoading } = useQuery({
    queryKey: ['operator-roles'],
    queryFn: async () => (await api.get<OperatorRole[]>('/api/operator-roles')).data,
    enabled: canManage,
  })

  const createMutation = useMutation({
    mutationFn: async (role: EditState) => api.post('/api/operator-roles', role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-roles'] })
      toast.success('Role added')
      setNewRole(emptyEdit)
    },
    onError: () => toast.error('Failed to add role'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: EditState }) =>
      api.put(`/api/operator-roles/${id}`, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-roles'] })
      toast.success('Role updated')
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update role'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/operator-roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-roles'] })
      toast.success('Role removed')
    },
    onError: () => toast.error('Failed to remove role'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(newRole)
  }

  function startEdit(role: OperatorRole) {
    setEditingId(role.id)
    setEditRole({ name: role.name, color: role.color, accessLevel: role.accessLevel })
  }

  if (!canManage) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Operator Roles</h1>
        <p className="text-muted-foreground text-sm">
          Check-in roles available for operators, along with their credential color and access
          level.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    {editingId === role.id ? (
                      <Input
                        value={editRole.name}
                        onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
                        className="h-8 max-w-xs"
                        autoFocus
                      />
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Swatch color={role.color} />
                        {role.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === role.id ? (
                      <input
                        type="color"
                        value={editRole.color}
                        onChange={(e) => setEditRole({ ...editRole, color: e.target.value })}
                        className="h-8 w-14 cursor-pointer rounded border"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Swatch color={role.color} />
                        {role.color}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === role.id ? (
                      <Input
                        value={editRole.accessLevel}
                        onChange={(e) => setEditRole({ ...editRole, accessLevel: e.target.value })}
                        placeholder="L1"
                        className="h-8 w-24"
                      />
                    ) : (
                      role.accessLevel
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {editingId === role.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={
                            !editRole.name.trim() || !editRole.accessLevel.trim() || updateMutation.isPending
                          }
                          onClick={() => updateMutation.mutate({ id: role.id, role: editRole })}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(role)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(role.id)}>
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
          <CardTitle className="text-base">Add Role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roleName">Name</Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="Net Control"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roleColor">Color</Label>
              <input
                id="roleColor"
                type="color"
                value={newRole.color}
                onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roleAccessLevel">Access Level</Label>
              <Input
                id="roleAccessLevel"
                value={newRole.accessLevel}
                onChange={(e) => setNewRole({ ...newRole, accessLevel: e.target.value })}
                placeholder="L1"
                className="w-24"
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="size-4" />
              Add Role
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
