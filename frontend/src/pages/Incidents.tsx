import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Play, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const statusVariant: Record<Incident['status'], 'default' | 'secondary' | 'destructive'> = {
  PLANNED: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'destructive',
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
  const [endTarget, setEndTarget] = useState<Incident | null>(null)

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<Incident[]>('/api/incidents')).data,
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="text-muted-foreground text-sm">
          Incidents you can view — either via a permission grant, or because you're currently checked in.
        </p>
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
              {incidents?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No incidents visible to you yet.
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
                        disabled={!incident.canEdit || startMutation.isPending}
                        title={incident.canEdit ? 'Start incident' : 'Requires edit access to this incident'}
                        onClick={() => startMutation.mutate(incident.id)}
                      >
                        <Play className="size-4" />
                        Start
                      </Button>
                    )}
                    {incident.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!incident.canEdit}
                        title={incident.canEdit ? 'End incident' : 'Requires edit access to this incident'}
                        onClick={() => setEndTarget(incident)}
                      >
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
