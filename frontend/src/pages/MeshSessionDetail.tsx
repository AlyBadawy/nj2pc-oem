import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronsUpDown,
  Crosshair,
  FileDown,
  Loader2,
  MapPin,
  PackagePlus,
  Pencil,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  Incident,
  MeshLanClientSnapshot,
  MeshLinkSnapshot,
  MeshLinkType,
  MeshNodeSnapshot,
  MeshSessionDetail as MeshSessionDetailType,
  Resource,
  ResourceCheckIn,
  ResourceLastLocation,
  ResourceType,
} from '@/lib/types'
import { LINK_TYPE_LABEL } from '@/lib/meshVisual'
import { computeIncidentBounds, isFarFromIncident } from '@/lib/meshIncidentArea'
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
import { MeshMap, type MeshMapHandle } from '@/components/MeshMap'
import { MeshMapLegend } from '@/components/MeshMapLegend'

type PdfOrientation = 'PORTRAIT' | 'LANDSCAPE'
type PdfLinkFilter = 'ALL' | 'RF'

type NodeOverride = {
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
  hostname,
  prefillFrom,
  open,
  onOpenChange,
  onCreated,
}: {
  hostname: string | null
  /** When present (mesh nodes only), the equipment type is best-effort guessed and its custom
   * fields prefilled from scraped node data. LAN devices have no equivalent scraped detail, so
   * they're always a blank type-then-fields flow the user fills in themselves. */
  prefillFrom?: MeshNodeSnapshot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (resource: Resource) => void
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

  function openFor(h: string, prefillNode: MeshNodeSnapshot | null | undefined, types: ResourceType[] | undefined) {
    setIdentifier(h)
    const guessedType = prefillNode ? types?.find((t) => /aredn.*node/i.test(t.name)) : undefined
    if (guessedType && prefillNode) {
      setResourceTypeId(String(guessedType.id))
      setCustomFields(prefillCustomFields(prefillNode, guessedType))
    } else {
      setResourceTypeId('')
      setCustomFields({})
    }
  }

  // Re-derive the prefill whenever the dialog opens for a (possibly new) hostname/type list.
  const [lastOpenedFor, setLastOpenedFor] = useState<string | null>(null)
  if (open && hostname && resourceTypes && lastOpenedFor !== hostname) {
    setLastOpenedFor(hostname)
    openFor(hostname, prefillFrom, resourceTypes)
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
      onCreated(resource)
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
          <DialogTitle>Add {hostname} as Gear</DialogTitle>
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

function GeneratePdfDialog({
  open,
  onOpenChange,
  incidentId,
  session,
  nodes,
  incident,
  mapHandleRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidentId: string | undefined
  session: MeshSessionDetailType
  nodes: (MeshNodeSnapshot & { offSite?: boolean })[]
  incident: Incident | undefined
  mapHandleRef: React.RefObject<MeshMapHandle | null>
}) {
  const [orientation, setOrientation] = useState<PdfOrientation>('LANDSCAPE')
  const [linkFilter, setLinkFilter] = useState<PdfLinkFilter>('ALL')
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const links = linkFilter === 'RF' ? session.links.filter((l) => l.linkTypeNormalized === 'RF') : session.links

      // The PDF's map should stay focused on the incident site — off-site nodes and anything
      // more than a mile outside the incident area (boundary, or on-site nodes if no boundary is
      // drawn) are dropped from the captured image, along with any link touching them, so a
      // distant relay/gateway doesn't force the map to zoom out past the point of usefulness.
      const incidentBounds = computeIncidentBounds(incident?.boundaryPoints, nodes)
      const mapNodes = nodes.filter((n) => {
        if (n.offSite) return false
        if (!incidentBounds) return true
        const lat = Number(n.latitude)
        const lng = Number(n.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return true
        return !isFarFromIncident(lat, lng, incidentBounds)
      })
      const mapNodeHostnames = new Set(mapNodes.map((n) => n.hostname.toLowerCase()))
      const mapLinks = links.filter(
        (l) => mapNodeHostnames.has(l.fromHostname.toLowerCase()) && mapNodeHostnames.has(l.toHostname.toLowerCase()),
      )

      const mapImageBase64 = mapHandleRef.current?.captureSnapshot({ nodes: mapNodes, links: mapLinks })
      if (!mapImageBase64) {
        toast.error('Map is not ready yet — try again in a moment')
        setGenerating(false)
        return
      }
      const response = await api.post(
        `/api/incidents/${incidentId}/mesh-sessions/${session.id}/pdf`,
        { orientation, linkFilter, mapImageBase64 },
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `Mesh-Scan-${(session.label || 'scan').replace(/[^a-zA-Z0-9-]+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      onOpenChange(false)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate PDF</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Map Orientation</Label>
            <Select value={orientation} onValueChange={(v) => setOrientation(v as PdfOrientation)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LANDSCAPE">Horizontal</SelectItem>
                <SelectItem value="PORTRAIT">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Links to Include</Label>
            <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as PdfLinkFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All links</SelectItem>
                <SelectItem value="RF">RF only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LinkSortColumn = 'from' | 'to' | 'type' | 'status' | 'rx' | 'rtt' | 'snr'

function parseLeadingNumber(value: string | null): number | null {
  if (!value) return null
  const match = value.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function compareLinks(a: MeshLinkSnapshot, b: MeshLinkSnapshot, column: LinkSortColumn): number {
  switch (column) {
    case 'from':
      return a.fromHostname.localeCompare(b.fromHostname)
    case 'to':
      return a.toHostname.localeCompare(b.toHostname)
    case 'type':
      return LINK_TYPE_LABEL[a.linkTypeNormalized].localeCompare(LINK_TYPE_LABEL[b.linkTypeNormalized])
    case 'status':
      return (a.linkQualityStatus ?? '').localeCompare(b.linkQualityStatus ?? '')
    case 'rx':
    case 'rtt':
    case 'snr': {
      const field = column === 'rx' ? 'rxPercent' : column === 'rtt' ? 'rttMs' : 'snr'
      const an = parseLeadingNumber(a[field])
      const bn = parseLeadingNumber(b[field])
      if (an == null && bn == null) return 0
      if (an == null) return 1
      if (bn == null) return -1
      return an - bn
    }
  }
}

function SortableHead({
  label,
  column,
  sort,
  onSort,
}: {
  label: string
  column: LinkSortColumn
  sort: { column: LinkSortColumn; direction: 'asc' | 'desc' } | null
  onSort: (column: LinkSortColumn) => void
}) {
  const active = sort?.column === column
  const Icon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        <Icon className={active ? 'size-3.5' : 'size-3.5 text-muted-foreground/50'} />
      </button>
    </TableHead>
  )
}

export function MeshSessionDetail() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [overrides, setOverrides] = useState<Record<string, NodeOverride>>({})
  const [addGearNode, setAddGearNode] = useState<MeshNodeSnapshot | null>(null)
  const [addGearLanDevice, setAddGearLanDevice] = useState<MeshLanClientSnapshot | null>(null)
  const [deployNode, setDeployNode] = useState<MeshNodeSnapshot | null>(null)
  const [editDeployCheckIn, setEditDeployCheckIn] = useState<ResourceCheckIn | null>(null)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [excludedLinkTypes, setExcludedLinkTypes] = useState<Set<MeshLinkType>>(new Set())
  const [excludedLinkStatuses, setExcludedLinkStatuses] = useState<Set<string>>(new Set())
  const [linkSort, setLinkSort] = useState<{ column: LinkSortColumn; direction: 'asc' | 'desc' } | null>(null)
  const mapHandleRef = useRef<MeshMapHandle>(null)

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

  // Whether a node/LAN device "matches a gear" is re-checked live against current inventory on
  // every render, rather than trusting resourceId/resourceIdentifier baked into the immutable
  // scan snapshot — gear is often added to inventory (or renamed) after a scan was taken, and a
  // stale match (or stale non-match) would otherwise only self-correct if the operator happened
  // to reopen the Add-as-Gear dialog for that exact hostname again.
  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })
  const resourceByIdentifier = new Map((resources ?? []).map((r) => [r.identifier.toLowerCase(), r]))

  const linkTypesPresent = useMemo(
    () => Array.from(new Set((session?.links ?? []).map((l) => l.linkTypeNormalized))),
    [session],
  )
  const linkStatusesPresent = useMemo(
    () => Array.from(new Set((session?.links ?? []).map((l) => l.linkQualityStatus || '—'))),
    [session],
  )
  const filteredSortedLinks = useMemo(() => {
    const links = session?.links ?? []
    const filtered = links.filter((l) => {
      if (excludedLinkTypes.has(l.linkTypeNormalized)) return false
      const status = l.linkQualityStatus || '—'
      if (excludedLinkStatuses.has(status)) return false
      return true
    })
    if (!linkSort) return filtered
    const sorted = [...filtered].sort((a, b) => compareLinks(a, b, linkSort.column))
    if (linkSort.direction === 'desc') sorted.reverse()
    return sorted
  }, [session, excludedLinkTypes, excludedLinkStatuses, linkSort])

  if (!session) return null

  const openCheckIns = (resourceCheckIns ?? []).filter((c) => !c.checkedOutAt)
  const openResourceIds = new Set(openCheckIns.map((c) => c.resourceId))
  const openCheckInByResource = new Map(openCheckIns.map((c) => [c.resourceId, c]))

  const nodes: (MeshNodeSnapshot & { offSite?: boolean })[] = session.nodes.map((n) => {
    const o = overrides[n.hostname.toLowerCase()]
    const liveMatch = resourceByIdentifier.get(n.hostname.toLowerCase())
    const resourceId = liveMatch?.id ?? null
    const deployedHere = resourceId ? openResourceIds.has(resourceId) : false
    const openCheckIn = resourceId ? openCheckInByResource.get(resourceId) : undefined
    const offSite = deployedHere && !!openCheckIn?.offSite
    return {
      ...n,
      resourceId,
      resourceIdentifier: liveMatch?.identifier ?? null,
      resourceOwnerCallsign: liveMatch?.ownerCallsign ?? null,
      resourceCustomFields: liveMatch?.customFields ?? null,
      latitude: o?.latitude !== undefined ? o.latitude : n.latitude,
      longitude: o?.longitude !== undefined ? o.longitude : n.longitude,
      offSite,
    }
  })

  const lanClients: MeshLanClientSnapshot[] = session.lanClients.map((c) => {
    const liveMatch = resourceByIdentifier.get(c.deviceHostname.toLowerCase())
    return {
      ...c,
      resourceId: liveMatch?.id ?? null,
      resourceIdentifier: liveMatch?.identifier ?? null,
      resourceOwnerCallsign: liveMatch?.ownerCallsign ?? null,
      resourceCustomFields: liveMatch?.customFields ?? null,
    }
  })

  function applyOverride(hostname: string, patch: NodeOverride) {
    setOverrides((prev) => ({ ...prev, [hostname.toLowerCase()]: { ...prev[hostname.toLowerCase()], ...patch } }))
  }

  function toggleLinkType(type: MeshLinkType) {
    setExcludedLinkTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function toggleLinkStatus(status: string) {
    setExcludedLinkStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function handleSort(column: LinkSortColumn) {
    setLinkSort((prev) => {
      if (prev?.column === column) {
        return prev.direction === 'asc' ? { column, direction: 'desc' } : null
      }
      return { column, direction: 'asc' }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        <Button variant="outline" size="sm" onClick={() => setPdfDialogOpen(true)}>
          <FileDown className="size-4" />
          Generate PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Map</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 min-w-0">
            <MeshMap
              ref={mapHandleRef}
              nodes={nodes}
              links={session.links}
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
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({filteredSortedLinks.length}
              {filteredSortedLinks.length !== session.links.length ? ` of ${session.links.length}` : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              {linkTypesPresent.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!excludedLinkTypes.has(type)}
                    onChange={() => toggleLinkType(type)}
                  />
                  {LINK_TYPE_LABEL[type]}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              {linkStatusesPresent.map((status) => (
                <label key={status} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!excludedLinkStatuses.has(status)}
                    onChange={() => toggleLinkStatus(status)}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="From" column="from" sort={linkSort} onSort={handleSort} />
                <SortableHead label="To" column="to" sort={linkSort} onSort={handleSort} />
                <SortableHead label="Type" column="type" sort={linkSort} onSort={handleSort} />
                <SortableHead label="Status" column="status" sort={linkSort} onSort={handleSort} />
                <SortableHead label="RX" column="rx" sort={linkSort} onSort={handleSort} />
                <SortableHead label="RTT" column="rtt" sort={linkSort} onSort={handleSort} />
                <SortableHead label="SNR" column="snr" sort={linkSort} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSortedLinks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {session.links.length === 0 ? 'No links recorded.' : 'No links match the current filters.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredSortedLinks.map((l) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            LAN Devices
            <span className="ml-2 text-muted-foreground font-normal text-sm">({lanClients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device Hostname</TableHead>
                <TableHead>Connected Via (Node)</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Gear</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lanClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No LAN devices recorded.
                  </TableCell>
                </TableRow>
              )}
              {lanClients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.deviceHostname}</TableCell>
                  <TableCell>{c.nodeHostname}</TableCell>
                  <TableCell>
                    {c.deviceUrl ? (
                      <a href={c.deviceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {c.deviceUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {c.resourceId ? (
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/resources/${c.resourceId}`)}>
                        {c.resourceIdentifier}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!c.resourceId && (
                      <Button variant="ghost" size="sm" onClick={() => setAddGearLanDevice(c)}>
                        <PackagePlus className="size-4" />
                        Add as Gear
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddGearDialog
        hostname={addGearNode?.hostname ?? addGearLanDevice?.deviceHostname ?? null}
        prefillFrom={addGearNode}
        open={!!addGearNode || !!addGearLanDevice}
        onOpenChange={(open) => {
          if (!open) {
            setAddGearNode(null)
            setAddGearLanDevice(null)
          }
        }}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['resources'] })}
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
      <GeneratePdfDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        incidentId={id}
        session={session}
        nodes={nodes}
        incident={incident}
        mapHandleRef={mapHandleRef}
      />
    </div>
  )
}
