import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Crosshair, Loader2, MapPin, Pencil, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { DeploymentLocation, Incident, Resource, ResourceCheckIn, ResourceType } from '@/lib/types'
import { LocationPreviewMap } from '@/components/LocationPreviewMap'
import { LocationPinMap } from '@/components/LocationPinMap'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Coords = { lat: string; lng: string }
type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'

function DeploymentLocationCard({
  location,
  checkIns,
  resourceTypes,
  availableResources,
  canEdit,
  onAdd,
  onRemove,
  onEdit,
  addPending,
  removePending,
}: {
  location: DeploymentLocation
  checkIns: ResourceCheckIn[]
  resourceTypes: ResourceType[]
  availableResources: Resource[]
  canEdit: boolean
  onAdd: (resourceId: number) => void
  onRemove: (checkInId: number) => void
  onEdit: () => void
  addPending: boolean
  removePending: boolean
}) {
  const [typeId, setTypeId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const availableOfType = availableResources.filter((r) => String(r.resourceTypeId) === typeId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="size-4 text-primary shrink-0" />
          <span className="truncate">{location.name}</span>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto shrink-0 text-muted-foreground"
              title="Edit location"
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <LocationPreviewMap latitude={location.latitude} longitude={location.longitude} />
        {location.notes && <p className="text-sm text-muted-foreground">{location.notes}</p>}

        <ul className="flex flex-col gap-1">
          {checkIns.length === 0 && <li className="text-sm text-muted-foreground">No equipment here yet.</li>}
          {checkIns.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted">
              <Link to={`/resources/${c.resourceId}`} className="font-medium hover:underline truncate">
                {c.resourceIdentifier}
              </Link>
              <span className="text-muted-foreground truncate">({c.resourceTypeName})</span>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                  title="Remove from this location"
                  disabled={removePending}
                  onClick={() => onRemove(c.id)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={typeId}
                onValueChange={(v) => {
                  setTypeId(v)
                  setResourceId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Equipment</Label>
              <Select value={resourceId} onValueChange={setResourceId} disabled={!typeId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={!typeId ? 'Pick a type first' : availableOfType.length ? 'Select' : 'None available'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableOfType.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.identifier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!resourceId || addPending}
              onClick={() => {
                onAdd(Number(resourceId))
                setTypeId('')
                setResourceId('')
              }}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function IncidentGear() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')

  const [editingLocation, setEditingLocation] = useState<DeploymentLocation | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editCoords, setEditCoords] = useState<Coords | null>(null)

  function openEdit(location: DeploymentLocation) {
    setEditingLocation(location)
    setEditName(location.name)
    setEditNotes(location.notes ?? '')
    setEditCoords(
      location.latitude && location.longitude ? { lat: location.latitude, lng: location.longitude } : null,
    )
  }

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  const { data: locations } = useQuery({
    queryKey: ['incidents', id, 'deployment-locations'],
    queryFn: async () => (await api.get<DeploymentLocation[]>(`/api/incidents/${id}/deployment-locations`)).data,
  })

  const createLocationMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<DeploymentLocation>(`/api/incidents/${id}/deployment-locations`, {
          name: newName,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: newNotes || null,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      toast.success('Deployment location created')
      setCreateOpen(false)
      setNewName('')
      setNewNotes('')
      setCoords(null)
      setGeoStatus('idle')
    },
    onError: () => toast.error('Failed to create deployment location'),
  })

  const updateLocationMutation = useMutation({
    mutationFn: async () =>
      (
        await api.put<DeploymentLocation>(`/api/incidents/${id}/deployment-locations/${editingLocation?.id}`, {
          name: editName,
          latitude: editCoords?.lat ?? null,
          longitude: editCoords?.lng ?? null,
          notes: editNotes || null,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      toast.success('Deployment location updated')
      setEditingLocation(null)
    },
    onError: () => toast.error('Failed to update deployment location'),
  })

  const checkInMutation = useMutation({
    mutationFn: async ({ resourceId, deploymentLocationId }: { resourceId: number; deploymentLocationId: number }) =>
      api.post(`/api/incidents/${id}/resource-checkins`, { resourceId, deploymentLocationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment deployed')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to deploy equipment'
      toast.error(message)
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: async (checkInId: number) => api.post(`/api/incidents/${id}/resource-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment checked out')
    },
    onError: () => toast.error('Failed to check out resource'),
  })

  function captureLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })
        setGeoStatus('granted')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!incident) return null

  const canEdit = incident.canEdit
  const openCheckIns = resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const checkedInResourceIds = new Set(openCheckIns.map((c) => c.resourceId))
  const availableResources = resources?.filter((r) => !checkedInResourceIds.has(r.id)) ?? []
  const sortedLocations = [...(locations ?? [])].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to {incident.name}
        </Button>
        <h1 className="text-2xl font-semibold">Gear &amp; Equipment</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLocations.map((location) => (
          <DeploymentLocationCard
            key={location.id}
            location={location}
            checkIns={openCheckIns
              .filter((c) => c.deploymentLocationId === location.id)
              .sort(
                (a, b) =>
                  a.resourceTypeName.localeCompare(b.resourceTypeName) ||
                  a.resourceIdentifier.localeCompare(b.resourceIdentifier),
              )}
            resourceTypes={resourceTypes ?? []}
            availableResources={availableResources}
            canEdit={!!canEdit}
            addPending={checkInMutation.isPending}
            removePending={checkOutMutation.isPending}
            onAdd={(resourceId) => checkInMutation.mutate({ resourceId, deploymentLocationId: location.id })}
            onRemove={(checkInId) => checkOutMutation.mutate(checkInId)}
            onEdit={() => openEdit(location)}
          />
        ))}

        {canEdit && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground hover:border-primary/40"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">New Deployment Location</span>
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Check-Ins
            <span className="ml-2 text-muted-foreground font-normal text-sm">({resourceCheckIns?.length ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Checked In</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Deployment Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!resourceCheckIns || resourceCheckIns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No equipment checked in yet.
                  </TableCell>
                </TableRow>
              )}
              {resourceCheckIns?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to={`/resources/${c.resourceId}`} className="hover:underline">
                      {c.resourceIdentifier}
                    </Link>
                  </TableCell>
                  <TableCell>{c.resourceTypeName}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(c.checkedInAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.checkedOutAt ? new Date(c.checkedOutAt).toLocaleString() : <Badge variant="default">On Scene</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.deploymentLocationName || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Deployment Location</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createLocationMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newLocationName">Location Name</Label>
              <Input
                id="newLocationName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Main Stage, Repeater Site A"
                required
              />
            </div>
            <Button type="button" variant="outline" disabled={geoStatus === 'locating'} onClick={captureLocation}>
              {geoStatus === 'locating' ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
              Capture My Location
            </Button>
            {geoStatus === 'denied' && (
              <p className="text-sm text-destructive">Location access was denied. Place the pin manually below.</p>
            )}
            {geoStatus === 'unsupported' && (
              <p className="text-sm text-destructive">This device doesn't support location capture. Place the pin manually below.</p>
            )}
            <LocationPinMap latitude={coords?.lat ?? ''} longitude={coords?.lng ?? ''} onChange={(lat, lng) => setCoords({ lat, lng })} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newLocationNotes">Notes</Label>
              <Textarea id="newLocationNotes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!newName || createLocationMutation.isPending}>
                {createLocationMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deployment Location</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateLocationMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editLocationName">Location Name</Label>
              <Input
                id="editLocationName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Main Stage, Repeater Site A"
                required
              />
            </div>
            <LocationPinMap
              latitude={editCoords?.lat ?? ''}
              longitude={editCoords?.lng ?? ''}
              onChange={(lat, lng) => setEditCoords({ lat, lng })}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editLocationNotes">Notes</Label>
              <Textarea id="editLocationNotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!editName || updateLocationMutation.isPending}>
                {updateLocationMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
