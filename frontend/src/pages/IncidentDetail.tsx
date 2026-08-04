import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident, IncidentLog, Operator, Priority } from '@/lib/types'
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createLogMutation.mutate()
  }

  if (!incident) return null

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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Log Entry
          </Button>
        </div>
        {incident.description && <p className="mt-3 text-sm max-w-2xl">{incident.description}</p>}
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
    </div>
  )
}
