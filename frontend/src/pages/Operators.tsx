import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Operator, OperatorStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type FormState = {
  callsign: string
  firstName: string
  lastName: string
  licenseClass: string
  phone: string
  email: string
  status: OperatorStatus
  notes: string
}

const emptyForm: FormState = {
  callsign: '',
  firstName: '',
  lastName: '',
  licenseClass: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  notes: '',
}

export function Operators() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Operator | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.put(`/api/operators/${editing.id}`, form)
      }
      return api.post('/api/operators', form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success(editing ? 'Operator updated' : 'Operator created')
      setDialogOpen(false)
    },
    onError: () => toast.error('Failed to save operator'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator removed')
    },
    onError: () => toast.error('Failed to delete operator'),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(operator: Operator) {
    setEditing(operator)
    setForm({
      callsign: operator.callsign,
      firstName: operator.firstName,
      lastName: operator.lastName,
      licenseClass: operator.licenseClass ?? '',
      phone: operator.phone ?? '',
      email: operator.email ?? '',
      status: operator.status,
      notes: operator.notes ?? '',
    })
    setDialogOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operators</h1>
          <p className="text-muted-foreground text-sm">Registered operator roster.</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Register Operator
          </Button>
        )}
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
                <TableHead>License</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.callsign}</TableCell>
                  <TableCell>
                    {op.firstName} {op.lastName}
                  </TableCell>
                  <TableCell>{op.licenseClass || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {op.phone || op.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(op)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(op.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Operator' : 'Register Operator'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="callsign">Callsign</Label>
                <Input
                  id="callsign"
                  value={form.callsign}
                  onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenseClass">License Class</Label>
                <Input
                  id="licenseClass"
                  value={form.licenseClass}
                  onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: OperatorStatus) => setForm({ ...form, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? 'Save Changes' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
