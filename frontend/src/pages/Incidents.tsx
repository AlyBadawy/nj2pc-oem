import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type FormState = {
  name: string
  location: string
  plannedStartTime: string
  plannedEndTime: string
  description: string
}

const emptyForm: FormState = {
  name: '',
  location: '',
  plannedStartTime: '',
  plannedEndTime: '',
  description: '',
}

const statusVariant: Record<Incident['status'], 'default' | 'secondary' | 'destructive'> = {
  PLANNED: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'destructive',
}

function toIso(localDateTime: string): string | null {
  return localDateTime ? new Date(localDateTime).toISOString() : null
}

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—'
  const fmt = (v: string) => new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `From ${fmt(start)}`
  return `Until ${fmt(end as string)}`
}

export function Incidents() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [endTarget, setEndTarget] = useState<Incident | null>(null)

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<Incident[]>('/api/incidents')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/incidents', {
        name: form.name,
        location: form.location || null,
        plannedStartTime: toIso(form.plannedStartTime),
        plannedEndTime: toIso(form.plannedEndTime),
        description: form.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident created')
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: () => toast.error('Failed to create incident'),
  })

  const startMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/api/incidents/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident started')
    },
    onError: () => toast.error('Failed to start incident'),
  })

  const endMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/api/incidents/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident ended — all operators and resources checked out')
      setEndTarget(null)
    },
    onError: () => toast.error('Failed to end incident'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-muted-foreground text-sm">Planned and active incidents.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Incident
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Actual</TableHead>
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
              {incidents?.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <TableCell className="font-medium">{incident.name}</TableCell>
                  <TableCell>{incident.location || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[incident.status]}>{incident.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatRange(incident.plannedStartTime, incident.plannedEndTime)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatRange(incident.actualStartTime, incident.actualEndTime)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {incident.status === 'PLANNED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={startMutation.isPending}
                        onClick={() => startMutation.mutate(incident.id)}
                      >
                        <Play className="size-4" />
                        Start
                      </Button>
                    )}
                    {incident.status === 'ACTIVE' && (
                      <Button variant="outline" size="sm" onClick={() => setEndTarget(incident)}>
                        <Flag className="size-4" />
                        End
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Passaic County Fair"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plannedStartTime">Planned Start</Label>
                <Input
                  id="plannedStartTime"
                  type="datetime-local"
                  value={form.plannedStartTime}
                  onChange={(e) => setForm({ ...form, plannedStartTime: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plannedEndTime">Planned End</Label>
                <Input
                  id="plannedEndTime"
                  type="datetime-local"
                  value={form.plannedEndTime}
                  onChange={(e) => setForm({ ...form, plannedEndTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Incident
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!endTarget} onOpenChange={(open) => !open && setEndTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Incident</DialogTitle>
            <DialogDescription>
              This will close "{endTarget?.name}" and automatically check out any operators and
              resources still on scene. No further changes can be made once it's closed. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={endMutation.isPending}
              onClick={() => endTarget && endMutation.mutate(endTarget.id)}
            >
              End Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
