import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, RadioTower, LogIn, LogOut, Flag, Play } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  CommunicationPlan,
  Incident,
  IncidentLog,
  Operator,
  OperatorCheckIn,
  Priority,
  Resource,
  ResourceCheckIn,
} from '@/lib/types'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const statusVariant: Record<Incident['status'], 'default' | 'secondary' | 'destructive'> = {
  PLANNED: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'destructive',
}

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'destructive'> = {
  ROUTINE: 'secondary',
  PRIORITY: 'default',
  EMERGENCY: 'destructive',
}

type LogFormState = {
  operatorId: string
  toOperatorId: string
  subject: string
  message: string
  priority: Priority
}

const emptyLogForm: LogFormState = {
  operatorId: '',
  toOperatorId: '',
  subject: '',
  message: '',
  priority: 'ROUTINE',
}

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<LogFormState>(emptyLogForm)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [operatorCheckInOpen, setOperatorCheckInOpen] = useState(false)
  const [operatorCheckInId, setOperatorCheckInId] = useState('')
  const [operatorCheckInNotes, setOperatorCheckInNotes] = useState('')
  const [resourceCheckInOpen, setResourceCheckInOpen] = useState(false)
  const [resourceCheckInId, setResourceCheckInId] = useState('')
  const [resourceCheckInNotes, setResourceCheckInNotes] = useState('')

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['incidents', id, 'logs'],
    queryFn: async () => (await api.get<IncidentLog[]>(`/api/incidents/${id}/logs`)).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const { data: commsPlans } = useQuery({
    queryKey: ['incidents', id, 'comms-plans'],
    queryFn: async () => (await api.get<CommunicationPlan[]>(`/api/incidents/${id}/comms-plans`)).data,
  })

  const { data: operatorCheckIns } = useQuery({
    queryKey: ['incidents', id, 'operator-checkins'],
    queryFn: async () => (await api.get<OperatorCheckIn[]>(`/api/incidents/${id}/operator-checkins`)).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  const createLogMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/logs`, {
        operatorId: Number(form.operatorId),
        toOperatorId: form.toOperatorId ? Number(form.toOperatorId) : null,
        subject: form.subject,
        message: form.message,
        priority: form.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'logs'] })
      toast.success('Log entry added')
      setDialogOpen(false)
      setForm(emptyLogForm)
    },
    onError: () => toast.error('Failed to add log entry'),
  })

  const checkInOperatorMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/operator-checkins`, {
        operatorId: Number(operatorCheckInId),
        notes: operatorCheckInNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked in')
      setOperatorCheckInOpen(false)
      setOperatorCheckInId('')
      setOperatorCheckInNotes('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to check in operator'
      toast.error(message)
    },
  })

  const checkOutOperatorMutation = useMutation({
    mutationFn: async (checkInId: number) =>
      api.post(`/api/incidents/${id}/operator-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked out')
    },
    onError: () => toast.error('Failed to check out operator'),
  })

  const checkInResourceMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/resource-checkins`, {
        resourceId: Number(resourceCheckInId),
        notes: resourceCheckInNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource checked in')
      setResourceCheckInOpen(false)
      setResourceCheckInId('')
      setResourceCheckInNotes('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to check in resource'
      toast.error(message)
    },
  })

  const checkOutResourceMutation = useMutation({
    mutationFn: async (checkInId: number) =>
      api.post(`/api/incidents/${id}/resource-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource checked out')
    },
    onError: () => toast.error('Failed to check out resource'),
  })

  const startIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident started')
    },
    onError: () => toast.error('Failed to start incident'),
  })

  const endIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Incident ended — all operators and resources checked out')
      setEndDialogOpen(false)
    },
    onError: () => toast.error('Failed to end incident'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createLogMutation.mutate()
  }

  if (!incident) return null

  const openOperatorCheckIns = operatorCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const openResourceCheckIns = resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const checkedInOperatorIds = new Set(openOperatorCheckIns.map((c) => c.operatorId))
  const checkedInResourceIds = new Set(openResourceCheckIns.map((c) => c.resourceId))
  const availableOperators = operators?.filter((o) => !checkedInOperatorIds.has(o.id)) ?? []
  const availableResources = resources?.filter((r) => !checkedInResourceIds.has(r.id)) ?? []
  const isClosed = incident.status === 'CLOSED'
  const isPlanned = incident.status === 'PLANNED'
  const isActive = incident.status === 'ACTIVE'

  const fmt = (v: string | null) =>
    v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Incidents
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{incident.name}</h1>
              <Badge variant={statusVariant[incident.status]}>{incident.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{incident.location}</p>
          </div>
          <div className="flex items-center gap-2">
            {isPlanned && (
              <Button
                variant="outline"
                disabled={startIncidentMutation.isPending}
                onClick={() => startIncidentMutation.mutate()}
              >
                <Play className="size-4" />
                Start Incident
              </Button>
            )}
            {isActive && (
              <Button variant="outline" onClick={() => setEndDialogOpen(true)}>
                <Flag className="size-4" />
                End Incident
              </Button>
            )}
            {!isClosed && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />
                Log Entry
              </Button>
            )}
          </div>
        </div>
        {incident.description && <p className="mt-3 text-sm max-w-2xl">{incident.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-muted-foreground">
          <span>
            Planned: {fmt(incident.plannedStartTime)} – {fmt(incident.plannedEndTime)}
          </span>
          <span>
            Actual: {fmt(incident.actualStartTime)} – {fmt(incident.actualEndTime)}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message Log (ICS-213)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(log.loggedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.operatorCallsign || '—'}</TableCell>
                  <TableCell>{log.toOperatorCallsign || '—'}</TableCell>
                  <TableCell className="font-medium">{log.subject}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[log.priority]}>{log.priority}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Operators On Scene
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({openOperatorCheckIns.length} on scene)
            </span>
          </CardTitle>
          {!isClosed && (
            <Button size="sm" onClick={() => setOperatorCheckInOpen(true)}>
              <LogIn className="size-4" />
              Check In
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Callsign</TableHead>
                <TableHead>Checked In</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!operatorCheckIns || operatorCheckIns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No operators checked in yet.
                  </TableCell>
                </TableRow>
              )}
              {operatorCheckIns?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.operatorCallsign}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(c.checkedInAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.checkedOutAt ? (
                      new Date(c.checkedOutAt).toLocaleString()
                    ) : (
                      <Badge variant="default">On Scene</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!c.checkedOutAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => checkOutOperatorMutation.mutate(c.id)}
                      >
                        <LogOut className="size-4" />
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Resources On Scene
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({openResourceCheckIns.length} on scene)
            </span>
          </CardTitle>
          {!isClosed && (
            <Button size="sm" onClick={() => setResourceCheckInOpen(true)}>
              <LogIn className="size-4" />
              Check In
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Checked In</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!resourceCheckIns || resourceCheckIns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No resources checked in yet.
                  </TableCell>
                </TableRow>
              )}
              {resourceCheckIns?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.resourceIdentifier}</TableCell>
                  <TableCell>{c.resourceType}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(c.checkedInAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.checkedOutAt ? (
                      new Date(c.checkedOutAt).toLocaleString()
                    ) : (
                      <Badge variant="default">On Scene</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!c.checkedOutAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => checkOutResourceMutation.mutate(c.id)}
                      >
                        <LogOut className="size-4" />
                        Check Out
                      </Button>
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
          <CardTitle className="text-base">Communications Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {commsPlans && commsPlans.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {commsPlans.map((plan) => (
                <li key={plan.id}>
                  <Link
                    to={`/comms-plans/${plan.id}`}
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <RadioTower className="size-4 text-muted-foreground" />
                    {plan.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No communications plans linked. Link one from the{' '}
              <Link to="/comms-plans" className="underline">
                Communications Plans
              </Link>{' '}
              page.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Log Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operatorId">From</Label>
                <Select
                  value={form.operatorId}
                  onValueChange={(value) => setForm({ ...form, operatorId: value })}
                >
                  <SelectTrigger id="operatorId">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="toOperatorId">To (optional)</Label>
                <Select
                  value={form.toOperatorId}
                  onValueChange={(value) => setForm({ ...form, toOperatorId: value })}
                >
                  <SelectTrigger id="toOperatorId">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value: Priority) => setForm({ ...form, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="PRIORITY">Priority</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createLogMutation.isPending || !form.operatorId}>
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={operatorCheckInOpen} onOpenChange={setOperatorCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Operator</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInOperatorMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorId">Operator</Label>
              <Select value={operatorCheckInId} onValueChange={setOperatorCheckInId}>
                <SelectTrigger id="checkInOperatorId">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((op) => (
                    <SelectItem key={op.id} value={String(op.id)}>
                      {op.callsign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorNotes">Notes</Label>
              <Textarea
                id="checkInOperatorNotes"
                value={operatorCheckInNotes}
                onChange={(e) => setOperatorCheckInNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!operatorCheckInId || checkInOperatorMutation.isPending}
              >
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceCheckInOpen} onOpenChange={setResourceCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Resource</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInResourceMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInResourceId">Resource</Label>
              <Select value={resourceCheckInId} onValueChange={setResourceCheckInId}>
                <SelectTrigger id="checkInResourceId">
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {availableResources.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.identifier} ({r.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInResourceNotes">Notes</Label>
              <Textarea
                id="checkInResourceNotes"
                value={resourceCheckInNotes}
                onChange={(e) => setResourceCheckInNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!resourceCheckInId || checkInResourceMutation.isPending}
              >
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Incident</DialogTitle>
            <DialogDescription>
              This will close "{incident.name}" and automatically check out{' '}
              {openOperatorCheckIns.length} operator{openOperatorCheckIns.length === 1 ? '' : 's'} and{' '}
              {openResourceCheckIns.length} resource{openResourceCheckIns.length === 1 ? '' : 's'}{' '}
              still on scene. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={endIncidentMutation.isPending}
              onClick={() => endIncidentMutation.mutate()}
            >
              End Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
