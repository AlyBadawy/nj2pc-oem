import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident, MeshSessionDetail as MeshSessionDetailType } from '@/lib/types'
import { LINK_TYPE_LABEL } from '@/lib/meshVisual'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MeshMap } from '@/components/MeshMap'
import { MeshMapLegend } from '@/components/MeshMapLegend'

export function MeshSessionDetail() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const navigate = useNavigate()

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: session } = useQuery({
    queryKey: ['incidents', id, 'mesh-sessions', sessionId],
    queryFn: async () => (await api.get<MeshSessionDetailType>(`/api/incidents/${id}/mesh-sessions/${sessionId}`)).data,
  })

  if (!session) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Incident
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{session.label || 'Mesh Scan'}</h1>
          <Badge variant="outline">{new Date(session.capturedAt).toLocaleString()}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Scanned from {session.localNodeHostname}
          {session.createdByCallsign && ` by ${session.createdByCallsign}`}
        </p>
        {session.notes && <p className="mt-2 text-sm max-w-2xl whitespace-pre-wrap">{session.notes}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Map</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 min-w-0">
            <MeshMap
              nodes={session.nodes}
              links={session.links}
              incidentLat={incident?.latitude}
              incidentLng={incident?.longitude}
            />
          </div>
          <div className="sm:w-48 shrink-0">
            <MeshMapLegend />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Nodes
            <span className="ml-2 text-muted-foreground font-normal text-sm">({session.nodes.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Gear</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.nodes.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.hostname}
                    {n.isLocalNode && (
                      <Badge variant="secondary" className="ml-2">
                        Local
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{n.model || '—'}</TableCell>
                  <TableCell>{n.firmwareVersion || '—'}</TableCell>
                  <TableCell>{n.channel || '—'}</TableCell>
                  <TableCell>{n.band || '—'}</TableCell>
                  <TableCell>
                    {n.resourceId ? (
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/resources/${n.resourceId}`)}>
                        {n.resourceIdentifier}
                      </Button>
                    ) : (
                      '—'
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
          <CardTitle className="text-base">
            Links
            <span className="ml-2 text-muted-foreground font-normal text-sm">({session.links.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RX</TableHead>
                <TableHead>RTT</TableHead>
                <TableHead>SNR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.links.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No links recorded.
                  </TableCell>
                </TableRow>
              )}
              {session.links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.fromHostname}</TableCell>
                  <TableCell>{l.toHostname}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{LINK_TYPE_LABEL[l.linkTypeNormalized]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.linkQualityStatus || '—'}</TableCell>
                  <TableCell>{l.rxPercent || '—'}</TableCell>
                  <TableCell>{l.rttMs || '—'}</TableCell>
                  <TableCell>{l.snr || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
