import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { OperatorRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function Roles() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const { data: roles, isLoading } = useQuery({
    queryKey: ['operator-roles'],
    queryFn: async () => (await api.get<OperatorRole[]>('/api/operator-roles')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => api.post('/api/operator-roles', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-roles'] })
      toast.success('Role added')
      setName('')
    },
    onError: () => toast.error('Failed to add role'),
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
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Operator Roles</h1>
        <p className="text-muted-foreground text-sm">
          Roles available when checking an operator in to an incident.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Roles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(role.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isAdmin && (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="roleName">New role</Label>
                <Input
                  id="roleName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Com-T"
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="size-4" />
                Add Role
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
