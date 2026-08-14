import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, RadioTower, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { isMixedContentError, isNotOnMeshError, runMeshScrape, type MeshScrapeResult } from '@/lib/meshScrape'
import { LINK_TYPE_LABEL } from '@/lib/meshVisual'
import type { Incident, MeshLinkType, MeshSessionDetail } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Phase = 'scan' | 'review' | 'done'

export function MeshScan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('scan')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState('')
  const [scanError, setScanError] = useState<{ mixedContent: boolean; message: string } | null>(null)
  const [result, setResult] = useState<MeshScrapeResult | null>(null)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  useEffect(() => {
    if (incident && (!incident.canEdit || incident.status === 'CLOSED')) {
      toast.error('You do not have permission to scan mesh on this incident')
      navigate(`/incidents/${id}`, { replace: true })
    }
  }, [incident, id, navigate])

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    setProgress('Starting scan…')
    try {
      const scraped = await runMeshScrape((message) => setProgress(message))
      setResult(scraped)
      setPhase('review')
    } catch (err) {
      setScanError({
        mixedContent: isMixedContentError(err),
        message: isMixedContentError(err)
          ? (err as Error).message
          : isNotOnMeshError(err)
            ? 'Could not reach the mesh — make sure this device is connected to it, then try again.'
            : 'The scan failed partway through. You can try again.',
      })
    } finally {
      setScanning(false)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No scan result')
      return (
        await api.post<MeshSessionDetail>(`/api/incidents/${id}/mesh-sessions`, {
          label: label || null,
          capturedAt: new Date().toISOString(),
          notes: notes || null,
          localNodeHostname: result.localNodeHostname,
          nodes: result.nodes,
          links: result.links,
          lanClients: result.lanClients,
        })
      ).data
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'mesh-sessions'] })
      toast.success('Mesh scan recorded')
      navigate(`/incidents/${id}/mesh/${session.id}`)
    },
    onError: () => toast.error('Failed to save mesh scan'),
  })

  if (!incident || !incident.canEdit || incident.status === 'CLOSED') return null

  const linkTypeCounts = result
    ? result.links.reduce<Record<string, number>>((acc, l) => {
        acc[l.linkTypeNormalized] = (acc[l.linkTypeNormalized] ?? 0) + 1
        return acc
      }, {})
    : {}

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Incident
        </Button>
        <h1 className="text-2xl font-semibold">Scan Mesh</h1>
        <p className="text-muted-foreground text-sm">{incident.name}</p>
      </div>

      {phase === 'scan' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan the mesh from this device</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Connect this device to the local AREDN mesh, then run the scan. It reads your
              current node's status page and checks each of its direct neighbors — no internet
              required.
            </p>
            <Button size="lg" disabled={scanning} onClick={handleScan} className="w-full sm:w-auto">
              {scanning ? <Loader2 className="size-4 animate-spin" /> : <RadioTower className="size-4" />}
              {scanning ? 'Scanning…' : 'Scan Local Node'}
            </Button>
            {scanning && <p className="text-sm text-muted-foreground">{progress}</p>}
            {scanError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <XCircle className="size-4 shrink-0 mt-0.5" />
                <span>
                  {scanError.mixedContent ? (
                    <>
                      This page is loaded over HTTPS, which browsers block from reaching the mesh
                      (plain HTTP only). Open this app at{' '}
                      <a href="http://al0y-emcomms.local.mesh" className="underline">
                        http://al0y-emcomms.local.mesh
                      </a>{' '}
                      instead, then try scanning again.
                    </>
                  ) : (
                    scanError.message
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === 'review' && result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan Results</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                Scanned from <span className="font-medium">{result.localNodeHostname}</span>
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>{result.nodes.length} node(s)</span>
                <span>{result.links.length} link(s)</span>
                <span>{result.lanClients.length} LAN client(s)</span>
              </div>
              {result.links.length > 0 && (
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {Object.entries(linkTypeCounts).map(([type, count]) => (
                    <span key={type}>
                      {LINK_TYPE_LABEL[type as MeshLinkType]}: {count}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nodes Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pr-4 py-1 font-medium">Hostname</th>
                      <th className="pr-4 py-1 font-medium">Model</th>
                      <th className="pr-4 py-1 font-medium">Firmware</th>
                      <th className="pr-4 py-1 font-medium">Channel</th>
                      <th className="pr-4 py-1 font-medium">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.nodes.map((n) => (
                      <tr key={n.hostname} className="border-t">
                        <td className="pr-4 py-1.5 font-medium whitespace-nowrap">
                          {n.hostname}
                          {n.isLocalNode && <span className="ml-1.5 text-xs text-muted-foreground">(local)</span>}
                        </td>
                        <td className="pr-4 py-1.5 whitespace-nowrap">{n.model || '—'}</td>
                        <td className="pr-4 py-1.5 whitespace-nowrap">{n.firmwareVersion || '—'}</td>
                        <td className="pr-4 py-1.5 whitespace-nowrap">{n.channel || '—'}</td>
                        <td className="pr-4 py-1.5 whitespace-nowrap">{n.band || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">LAN Devices Found</CardTitle>
            </CardHeader>
            <CardContent>
              {result.lanClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No LAN devices (cameras, cellular modems, etc.) found on any scanned node.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pr-4 py-1 font-medium">Device Hostname</th>
                        <th className="pr-4 py-1 font-medium">Connected Via (Node)</th>
                        <th className="pr-4 py-1 font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lanClients.map((c) => (
                        <tr key={`${c.nodeHostname}-${c.deviceHostname}`} className="border-t">
                          <td className="pr-4 py-1.5 font-medium whitespace-nowrap">{c.deviceHostname}</td>
                          <td className="pr-4 py-1.5 whitespace-nowrap">{c.nodeHostname}</td>
                          <td className="pr-4 py-1.5 whitespace-nowrap">
                            {c.deviceUrl ? (
                              <a href={c.deviceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {c.deviceUrl}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Save This Scan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meshLabel">Label</Label>
                <Input
                  id="meshLabel"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Pre-repositioning"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meshNotes">Notes</Label>
                <Textarea id="meshNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                  {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Save Scan
                </Button>
                <Button variant="outline" disabled={submitMutation.isPending} onClick={() => setPhase('scan')}>
                  Scan Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
