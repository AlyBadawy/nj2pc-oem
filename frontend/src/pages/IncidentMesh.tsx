import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RadioTower, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident, MeshSessionSummary } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function IncidentMesh() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: meshSessions } = useQuery({
    queryKey: ['incidents', id, 'mesh-sessions'],
    queryFn: async () => (await api.get<MeshSessionSummary[]>(`/api/incidents/${id}/mesh-sessions`)).data,
  })

  const deleteMeshSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => api.delete(`/api/incidents/${id}/mesh-sessions/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'mesh-sessions'] })
      toast.success('Mesh scan deleted')
    },
    onError: () => toast.error('Failed to delete mesh scan'),
  })

  if (!incident) return null

  const canEdit = incident.canEdit
  const isClosed = incident.status === 'CLOSED'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to {incident.name}
        </Button>
        <h1 className="text-2xl font-semibold">Mesh</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Mesh Scans
            <span className="ml-2 text-muted-foreground font-normal text-sm">({meshSessions?.length ?? 0})</span>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!canEdit || isClosed}
            title={canEdit ? 'Scan the local mesh' : 'Requires edit access to this incident'}
            onClick={() => navigate(`/incidents/${id}/mesh/scan`)}
          >
            <RadioTower className="size-4" />
            Scan Mesh
          </Button>
        </CardHeader>
        <CardContent>
          {meshSessions && meshSessions.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {meshSessions.map((s) => (
                <li key={s.id} className="flex items-center gap-1 rounded-md hover:bg-muted">
                  <Link
                    to={`/incidents/${id}/mesh/${s.id}`}
                    className="flex flex-1 min-w-0 flex-wrap items-center gap-2 px-2 py-1.5 text-sm"
                  >
                    <span className="font-medium">{s.label || 'Mesh Scan'}</span>
                    <span className="text-muted-foreground">{s.localNodeHostname}</span>
                    <Badge variant="outline">
                      {s.nodeCount} node{s.nodeCount === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="outline">
                      {s.linkCount} link{s.linkCount === 1 ? '' : 's'}
                    </Badge>
                    <span className="text-muted-foreground text-xs ml-auto">{new Date(s.capturedAt).toLocaleString()}</span>
                  </Link>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mr-1 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Delete mesh scan"
                      onClick={() => deleteMeshSessionMutation.mutate(s.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No mesh scans recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
