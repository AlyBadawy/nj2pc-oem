import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Incident, Operator, Resource, ResourceStatus, ResourceType } from '@/lib/types'
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
  type: ResourceType
  identifier: string
  frequency: string
  status: ResourceStatus
  assignedOperatorId: string
  assignedIncidentId: string
  notes: string
}

const emptyForm: FormState = {
  type: 'RADIO',
  identifier: '',
  frequency: '',
  status: 'AVAILABLE',
  assignedOperatorId: '',
  assignedIncidentId: '',
  notes: '',
}

const statusVariant: Record<ResourceStatus, 'default' | 'secondary' | 'destructive'> = {
  AVAILABLE: 'secondary',
  ASSIGNED: 'default',
  OUT_OF_SERVICE: 'destructive',
}

const NONE = '__none__'

export function Resources() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })
  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<Incident[]>('/api/incidents')).data,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        identifier: form.identifier,
        frequency: form.frequency || null,
        status: form.status,
        assignedOperatorId: form.assignedOperatorId ? Number(form.assignedOperatorId) : null,
        assignedIncidentId: form.assignedIncidentId ? Number(form.assignedIncidentId) : null,
        notes: form.notes || null,
      }
      if (editing) return api.put(`/api/resources/${editing.id}`, payload)
      return api.post('/api/resources', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success(editing ? 'Resource updated' : 'Resource created')
      setDialogOpen(false)
    },
    onError: () => toast.error('Failed to save resource'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource removed')
    },
    onError: () => toast.error('Failed to delete resource'),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(resource: Resource) {
    setEditing(resource)
    setForm({
      type: resource.type,
      identifier: resource.identifier,
      frequency: resource.frequency ?? '',
      status: resource.status,
      assignedOperatorId: resource.assignedOperatorId ? String(resource.assignedOperatorId) : '',
      assignedIncidentId: resource.assignedIncidentId ? String(resource.assignedIncidentId) : '',
      notes: resource.notes ?? '',
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
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-muted-foreground text-sm">Radios, repeaters, and equipment.</p>
        </div>
        <Button onClick={openCreate}>
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
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Incident</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {resources?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.type}</TableCell>
                  <TableCell className="font-medium">{r.identifier}</TableCell>
                  <TableCell>{r.frequency || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{r.assignedOperatorCallsign || '—'}</TableCell>
                  <TableCell>{r.assignedIncidentName || '—'}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(r.id)}
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
            <DialogTitle>{editing ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: ResourceType) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RADIO">Radio</SelectItem>
                    <SelectItem value="REPEATER">Repeater</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="identifier">Identifier</Label>
                <Input
                  id="identifier"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Input
                  id="frequency"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder="146.520 MHz"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: ResourceStatus) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignedOperatorId">Assigned Operator</Label>
                <Select
                  value={form.assignedOperatorId || NONE}
                  onValueChange={(value) =>
                    setForm({ ...form, assignedOperatorId: value === NONE ? '' : value })
                  }
                >
                  <SelectTrigger id="assignedOperatorId">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignedIncidentId">Assigned Incident</Label>
                <Select
                  value={form.assignedIncidentId || NONE}
                  onValueChange={(value) =>
                    setForm({ ...form, assignedIncidentId: value === NONE ? '' : value })
                  }
                >
                  <SelectTrigger id="assignedIncidentId">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {incidents?.map((incident) => (
                      <SelectItem key={incident.id} value={String(incident.id)}>
                        {incident.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {editing ? 'Save Changes' : 'Add Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
