import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Crosshair, Loader2, MapPin, PackagePlus, Pencil, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  Incident,
  MeshNodeSnapshot,
  MeshSessionDetail as MeshSessionDetailType,
  Resource,
  ResourceCheckIn,
  ResourceLastLocation,
  ResourceType,
} from '@/lib/types'
import { LINK_TYPE_LABEL } from '@/lib/meshVisual'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CustomFieldInputs, type CustomFieldValues } from '@/components/CustomFieldInputs'
import { MeshMap } from '@/components/MeshMap'
import { MeshMapLegend } from '@/components/MeshMapLegend'

type NodeOverride = {
  resourceId?: number
  resourceIdentifier?: string
  latitude?: string | null
  longitude?: string | null
}

/** Best-effort prefill from scraped node data into a resource type's custom fields, matched by
 * loose name substring — exact field names/schemas are admin-defined and vary, this just saves
 * retyping when the names line up with the existing "Aredn - Node" convention. */
function prefillCustomFields(node: MeshNodeSnapshot, type: ResourceType): CustomFieldValues {
  const values: CustomFieldValues = {}
  for (const field of type.fields) {
    const name = field.name.toLowerCase()
    if (name.includes('model') && node.model) values[field.name] = node.model
    else if (name.includes('firmware') && node.firmwareVersion) values[field.name] = node.firmwareVersion
    else if (name.includes('channel width') && node.channelWidth) values[field.name] = node.channelWidth
    else if (name.includes('frequency') && node.frequencyMhz) values[field.name] = node.frequencyMhz
    else if (name.includes('channel') && node.channel) values[field.name] = node.channel
  }
  return values
}

function AddGearDialog({
  node,
  open,
  onOpenChange,
  onCreated,
}: {
  node: MeshNodeSnapshot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (hostname: string, resource: Resource) => void
}) {
  const [resourceTypeId, setResourceTypeId] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
    enabled: open,
  })

  const selectedType = resourceTypes?.find((t) => String(t.id) === resourceTypeId)

  function openFor(n: MeshNodeSnapshot, types: ResourceType[] | undefined) {
    setIdentifier(n.hostname)
    const guessedType = types?.find((t) => /aredn.*node/i.test(t.name))
    if (guessedType) {
      setResourceTypeId(String(guessedType.id))
      setCustomFields(prefillCustomFields(n, guessedType))
    } else {
      setResourceTypeId('')
      setCustomFields({})
    }
  }

  // Re-derive the prefill whenever the dialog opens for a (possibly new) node/type list.
  const [lastOpenedFor, setLastOpenedFor] = useState<string | null>(null)
  if (open && node && resourceTypes && lastOpenedFor !== node.hostname) {
    setLastOpenedFor(node.hostname)
    openFor(node, resourceTypes)
  }

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<Resource>('/api/resources', {
          resourceTypeId: Number(resourceTypeId),
          identifier,
          serialNumber: null,
          ownerId: null,
          notes: null,
          customFields,
        })
      ).data,
    onSuccess: (resource) => {
      if (node) onCreated(node.hostname, resource)
      toast.success(`${resource.identifier} added as gear`)
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to add gear'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {node?.hostname} as Gear</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gearResourceType">Equipment Type</Label>
              <Select
                value={resourceTypeId}
                onValueChange={(value) => {
                  setResourceTypeId(value)
                  setCustomFields({})
                }}
              >
                <SelectTrigger id="gearResourceType">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gearIdentifier">Identifier</Label>
              <Input id="gearIdentifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
          </div>
          {selectedType && (
            <CustomFieldInputs fields={selectedType.fields} values={customFields} onChange={setCustomFields} />
          )}
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending || !resourceTypeId}>
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Add Gear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeployDialog({
  node,
  incidentId,
  open,
  onOpenChange,
  onDeployed,
}: {
  node: MeshNodeSnapshot | null
  incidentId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeployed: (hostname: string, latitude: string | null, longitude: string | null) => void
}) {
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [notes, setNotes] = useState('')
  const [locating, setLocating] = useState(false)
  const [lastOpenedFor, setLastOpenedFor] = useState<number | null>(null)

  const { data: lastLocation } = useQuery({
    queryKey: ['resources', node?.resourceId, 'last-location'],
    queryFn: async () => {
      const res = await api.get<ResourceLastLocation>(`/api/resources/${node?.resourceId}/last-location`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      return res.status === 204 ? null : res.data
    },
    enabled: open && !!node?.resourceId,
  })

  if (open && node?.resourceId && lastOpenedFor !== node.resourceId) {
    setLastOpenedFor(node.resourceId)
    // Defensive: only prefill from the node's own scraped location if it actually looks like a
    // coordinate — older saved sessions may have non-numeric placeholder text baked in from
    // before the scraper validated this (AREDN renders "Unknown" literally when no GPS is set).
    const isCoordinate = (v: string | null | undefined) => !!v && /^-?\d+(\.\d+)?$/.test(v)
    const fallbackLat = isCoordinate(node.latitude) ? node.latitude : ''
    const fallbackLng = isCoordinate(node.longitude) ? node.longitude : ''
    setLatitude(lastLocation?.latitude ?? fallbackLat ?? '')
    setLongitude(lastLocation?.longitude ?? fallbackLng ?? '')
    setNotes('')
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error('This device does not support location capture')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude))
        setLongitude(String(pos.coords.longitude))
        setLocating(false)
      },
      () => {
        toast.error('Could not get your location — enter coordinates manually')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const deployMutation = useMutation({
    mutationFn: async () =>
      api.post<ResourceCheckIn>(`/api/incidents/${incidentId}/resource-checkins`, {
        resourceId: node?.resourceId,
        notes: notes || null,
        latitude: latitude || null,
        longitude: longitude || null,
      }),
    onSuccess: () => {
      if (node) onDeployed(node.hostname, latitude || null, longitude || null)
      toast.success(`${node?.resourceIdentifier} deployed`)
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to deploy'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    deployMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy {node?.resourceIdentifier}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {lastLocation && (
            <p className="text-xs text-muted-foreground">
              Prefilled from its last deployment ({lastLocation.incidentName},{' '}
              {new Date(lastLocation.checkedInAt).toLocaleDateString()}) — not the node's own reported GPS, which
              can go stale.
            </p>
          )}
          <div className="flex items-center justify-between">
            <Label>Location</Label>
            <Button type="button" variant="ghost" size="sm" disabled={locating} onClick={captureLocation}>
              {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
              Capture My Location
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" />
            <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deployNotes">Notes</Label>
            <Textarea id="deployNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={deployMutation.isPending}>
              {deployMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Deploy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDeploymentDialog({
  checkIn,
  incidentId,
  open,
  onOpenChange,
}: {
  checkIn: ResourceCheckIn | null
  incidentId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [notes, setNotes] = useState('')
  const [offSite, setOffSite] = useState(false)
  const [locating, setLocating] = useState(false)
  const [lastOpenedFor, setLastOpenedFor] = useState<number | null>(null)

  if (open && checkIn && lastOpenedFor !== checkIn.id) {
    setLastOpenedFor(checkIn.id)
    setLatitude(checkIn.latitude ?? '')
    setLongitude(checkIn.longitude ?? '')
    setNotes(checkIn.notes ?? '')
    setOffSite(checkIn.offSite)
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error('This device does not support location capture')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude))
        setLongitude(String(pos.coords.longitude))
        setLocating(false)
      },
      () => {
        toast.error('Could not get your location — enter coordinates manually')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/incidents/${incidentId}/resource-checkins/${checkIn?.id}`, {
        notes: notes || null,
        latitude: offSite ? null : latitude || null,
        longitude: offSite ? null : longitude || null,
        offSite,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', incidentId, 'resource-checkins'] })
      toast.success(`${checkIn?.resourceIdentifier} deployment updated`)
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to update deployment'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {checkIn?.resourceIdentifier} Deployment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={offSite}
              onChange={(e) => setOffSite(e.target.checked)}
            />
            <span>
              Off-site
              <span className="block text-xs text-muted-foreground">
                Part of the mesh for this incident, but not physically at the incident location (e.g. a home
                gateway node).
              </span>
            </span>
          </label>
          {!offSite && (
            <>
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <Button type="button" variant="ghost" size="sm" disabled={locating} onClick={captureLocation}>
                  {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
                  Capture My Location
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" />
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="editDeployNotes">Notes</Label>
            <Textarea id="editDeployNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MeshSessionDetail() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [overrides, setOverrides] = useState<Record<string, NodeOverride>>({})
  const [addGearNode, setAddGearNode] = useState<MeshNodeSnapshot | null>(null)
  const [deployNode, setDeployNode] = useState<MeshNodeSnapshot | null>(null)
  const [editDeployCheckIn, setEditDeployCheckIn] = useState<ResourceCheckIn | null>(null)

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: session } = useQuery({
    queryKey: ['incidents', id, 'mesh-sessions', sessionId],
    queryFn: async () => (await api.get<MeshSessionDetailType>(`/api/incidents/${id}/mesh-sessions/${sessionId}`)).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  if (!session) return null

  const openCheckIns = (resourceCheckIns ?? []).filter((c) => !c.checkedOutAt)
  const openResourceIds = new Set(openCheckIns.map((c) => c.resourceId))
  const openCheckInByResource = new Map(openCheckIns.map((c) => [c.resourceId, c]))

  const nodes: MeshNodeSnapshot[] = session.nodes.map((n) => {
    const o = overrides[n.hostname.toLowerCase()]
    if (!o) return n
    return {
      ...n,
      resourceId: o.resourceId ?? n.resourceId,
      resourceIdentifier: o.resourceIdentifier ?? n.resourceIdentifier,
      latitude: o.latitude !== undefined ? o.latitude : n.latitude,
      longitude: o.longitude !== undefined ? o.longitude : n.longitude,
    }
  })

  function applyOverride(hostname: string, patch: NodeOverride) {
    setOverrides((prev) => ({ ...prev, [hostname.toLowerCase()]: { ...prev[hostname.toLowerCase()], ...patch } }))
  }

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
              nodes={nodes}
              links={session.links}
              incidentLat={incident?.latitude}
              incidentLng={incident?.longitude}
              boundaryPoints={incident?.boundaryPoints ?? null}
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
            <span className="ml-2 text-muted-foreground font-normal text-sm">({nodes.length})</span>
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
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((n) => {
                const deployedHere = n.resourceId ? openResourceIds.has(n.resourceId) : false
                const openCheckIn = n.resourceId ? openCheckInByResource.get(n.resourceId) : undefined
                const mapLat = deployedHere ? openCheckIn?.latitude : n.latitude
                const mapLng = deployedHere ? openCheckIn?.longitude : n.longitude
                return (
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
                    <TableCell className="text-sm whitespace-nowrap">
                      {deployedHere && openCheckIn?.offSite ? (
                        <Badge variant="secondary">Off-site</Badge>
                      ) : mapLat && mapLng ? (
                        <a
                          href={`https://www.google.com/maps?q=${mapLat},${mapLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <MapPin className="size-4" />
                          Map
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!n.resourceId && (
                          <Button variant="ghost" size="sm" onClick={() => setAddGearNode(n)}>
                            <PackagePlus className="size-4" />
                            Add as Gear
                          </Button>
                        )}
                        {n.resourceId && !deployedHere && (
                          <Button variant="ghost" size="sm" onClick={() => setDeployNode(n)}>
                            <Rocket className="size-4" />
                            Deploy
                          </Button>
                        )}
                        {n.resourceId && deployedHere && (
                          <>
                            <Badge variant="default">Deployed</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCheckIn && setEditDeployCheckIn(openCheckIn)}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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

      <AddGearDialog
        node={addGearNode}
        open={!!addGearNode}
        onOpenChange={(open) => !open && setAddGearNode(null)}
        onCreated={(hostname, resource) => {
          applyOverride(hostname, { resourceId: resource.id, resourceIdentifier: resource.identifier })
          queryClient.invalidateQueries({ queryKey: ['resources'] })
        }}
      />
      <DeployDialog
        node={deployNode}
        incidentId={id}
        open={!!deployNode}
        onOpenChange={(open) => !open && setDeployNode(null)}
        onDeployed={(hostname, latitude, longitude) => {
          applyOverride(hostname, { latitude, longitude })
          queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
        }}
      />
      <EditDeploymentDialog
        checkIn={editDeployCheckIn}
        incidentId={id}
        open={!!editDeployCheckIn}
        onOpenChange={(open) => !open && setEditDeployCheckIn(null)}
      />
    </div>
  )
}
