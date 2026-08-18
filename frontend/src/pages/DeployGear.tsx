import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Crosshair, ListPlus, Loader2, MapPin, PackagePlus, PlusCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { DeploymentLocation, Incident, Operator, Resource, ResourceCheckIn, ResourceType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomFieldInputs, type CustomFieldValues } from '@/components/CustomFieldInputs'
import { LocationPinMap } from '@/components/LocationPinMap'

type Coords = { lat: string; lng: string }
type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'

type NewResourceForm = {
  resourceTypeId: string
  identifier: string
  serialNumber: string
  notes: string
  ownerId: string
}

const emptyNewResourceForm: NewResourceForm = {
  resourceTypeId: '',
  identifier: '',
  serialNumber: '',
  notes: '',
  ownerId: '',
}

const NONE = '__none__'

export function DeployGear() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canAssignOwner = hasPermission(user, 'RESOURCE_MANAGE_ALL') || hasPermission(user, 'RESOURCE_ASSIGN_OWNER')

  const [phase, setPhase] = useState<'location' | 'add'>('location')
  const [locationMode, setLocationMode] = useState<'pick' | 'create'>('pick')
  const [pickLocationId, setPickLocationId] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationNotes, setNewLocationNotes] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [showManual, setShowManual] = useState(false)

  const [activeLocation, setActiveLocation] = useState<DeploymentLocation | null>(null)

  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [pickResourceTypeId, setPickResourceTypeId] = useState('')
  const [pickResourceId, setPickResourceId] = useState('')
  const [pickNotes, setPickNotes] = useState('')
  const [newResource, setNewResource] = useState<NewResourceForm>(emptyNewResourceForm)
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

  const [addedItems, setAddedItems] = useState<ResourceCheckIn[]>([])

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<Operator>('/api/auth/me')).data,
  })

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canAssignOwner,
  })

  const { data: locations } = useQuery({
    queryKey: ['incidents', id, 'deployment-locations'],
    queryFn: async () => (await api.get<DeploymentLocation[]>(`/api/incidents/${id}/deployment-locations`)).data,
  })

  useEffect(() => {
    if (incident && (!incident.canEdit || incident.status === 'CLOSED')) {
      toast.error('You do not have permission to deploy gear on this incident')
      navigate(`/incidents/${id}`, { replace: true })
    }
  }, [incident, id, navigate])

  const openResourceCheckIns = resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const checkedInResourceIds = new Set(openResourceCheckIns.map((c) => c.resourceId))
  const availableResources = resources?.filter((r) => !checkedInResourceIds.has(r.id)) ?? []
  const availableResourcesOfPickedType = availableResources.filter(
    (r) => String(r.resourceTypeId) === pickResourceTypeId,
  )
  const selectedType = resourceTypes?.find((t) => String(t.id) === newResource.resourceTypeId)

  function captureLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      setShowManual(true)
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })
        setGeoStatus('granted')
      },
      () => {
        setGeoStatus('denied')
        setShowManual(true)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const createLocationMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<DeploymentLocation>(`/api/incidents/${id}/deployment-locations`, {
          name: newLocationName,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: newLocationNotes || null,
        })
      ).data,
    onSuccess: (location) => {
      setActiveLocation(location)
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      setPhase('add')
    },
    onError: () => toast.error('Failed to create deployment location'),
  })

  function continueWithLocation() {
    if (locationMode === 'pick') {
      const location = locations?.find((l) => String(l.id) === pickLocationId)
      if (!location) return
      setActiveLocation(location)
      setPhase('add')
    } else {
      createLocationMutation.mutate()
    }
  }

  const checkInExistingMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<ResourceCheckIn>(`/api/incidents/${id}/resource-checkins`, {
          resourceId: Number(pickResourceId),
          notes: pickNotes || null,
          deploymentLocationId: activeLocation?.id ?? null,
        })
      ).data,
    onSuccess: (checkIn) => {
      setAddedItems((items) => [checkIn, ...items])
      setPickResourceTypeId('')
      setPickResourceId('')
      setPickNotes('')
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      toast.success(`${checkIn.resourceIdentifier} deployed`)
    },
    onError: () => toast.error('Failed to check in equipment'),
  })

  const removeMutation = useMutation({
    mutationFn: async (checkInId: number) =>
      api.post(`/api/incidents/${id}/resource-checkins/${checkInId}/checkout`),
    onSuccess: (_response, checkInId) => {
      setAddedItems((items) => items.filter((item) => item.id !== checkInId))
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      toast.success('Removed from this deployment')
    },
    onError: () => toast.error('Failed to remove — try again'),
  })

  const createAndCheckInMutation = useMutation({
    mutationFn: async () => {
      const resource = (
        await api.post<Resource>('/api/resources', {
          resourceTypeId: Number(newResource.resourceTypeId),
          identifier: newResource.identifier,
          serialNumber: newResource.serialNumber || null,
          ownerId: canAssignOwner && newResource.ownerId ? Number(newResource.ownerId) : (me?.id ?? null),
          notes: newResource.notes || null,
          customFields,
        })
      ).data
      try {
        return (
          await api.post<ResourceCheckIn>(`/api/incidents/${id}/resource-checkins`, {
            resourceId: resource.id,
            notes: newResource.notes || null,
            deploymentLocationId: activeLocation?.id ?? null,
          })
        ).data
      } catch (err) {
        toast.error(`${resource.identifier} was created but could not be checked in — find it under Existing Equipment and retry`)
        throw err
      }
    },
    onSuccess: (checkIn) => {
      setAddedItems((items) => [checkIn, ...items])
      setNewResource(emptyNewResourceForm)
      setCustomFields({})
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'deployment-locations'] })
      toast.success(`${checkIn.resourceIdentifier} created and deployed`)
    },
    onError: () => {},
  })

  if (!incident || !incident.canEdit || incident.status === 'CLOSED') return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Incident
        </Button>
        <h1 className="text-2xl font-semibold">Deploy Gear</h1>
        <p className="text-muted-foreground text-sm">{incident.name}</p>
      </div>

      {phase === 'location' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where are you deploying this equipment?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Every piece of gear you add next will be deployed to this same location — pick an existing one
              (e.g. a site you already set up earlier) or drop a new pin.
            </p>
            <div className="flex items-center rounded-md border p-0.5 w-fit">
              <Button variant={locationMode === 'pick' ? 'default' : 'ghost'} size="sm" onClick={() => setLocationMode('pick')}>
                <ListPlus className="size-4" />
                Existing Location
              </Button>
              <Button variant={locationMode === 'create' ? 'default' : 'ghost'} size="sm" onClick={() => setLocationMode('create')}>
                <PlusCircle className="size-4" />
                New Location
              </Button>
            </div>

            {locationMode === 'pick' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickLocationId">Deployment Location</Label>
                <Select value={pickLocationId} onValueChange={setPickLocationId}>
                  <SelectTrigger id="pickLocationId">
                    <SelectValue placeholder={locations?.length ? 'Select a location' : 'No locations yet on this incident'} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.name} ({l.gearCount} deployed)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newLocationName">Location Name</Label>
                  <Input
                    id="newLocationName"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="e.g. Main Stage, Repeater Site A"
                    required
                  />
                </div>
                <Button
                  size="lg"
                  disabled={geoStatus === 'locating'}
                  onClick={captureLocation}
                  className="w-full sm:w-auto"
                >
                  {geoStatus === 'locating' ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
                  Capture My Location
                </Button>

                {geoStatus === 'granted' && coords && (
                  <p className="text-sm text-muted-foreground">
                    Captured: {coords.lat}, {coords.lng}
                  </p>
                )}
                {geoStatus === 'denied' && (
                  <p className="text-sm text-destructive">
                    Location access was denied. Enter coordinates manually below, or continue without one.
                  </p>
                )}
                {geoStatus === 'unsupported' && (
                  <p className="text-sm text-destructive">
                    This device doesn't support location capture. Enter coordinates manually below, or continue
                    without one.
                  </p>
                )}

                <LocationPinMap
                  latitude={coords?.lat ?? ''}
                  longitude={coords?.lng ?? ''}
                  onChange={(lat, lng) => setCoords({ lat, lng })}
                />

                {!showManual && (
                  <button
                    type="button"
                    className="self-start text-sm text-muted-foreground hover:underline"
                    onClick={() => setShowManual(true)}
                  >
                    Enter coordinates manually
                  </button>
                )}

                {showManual && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        value={coords?.lat ?? ''}
                        onChange={(e) => setCoords({ lat: e.target.value, lng: coords?.lng ?? '' })}
                        placeholder="40.8915158"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        value={coords?.lng ?? ''}
                        onChange={(e) => setCoords({ lat: coords?.lat ?? '', lng: e.target.value })}
                        placeholder="-74.1959347"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newLocationNotes">Notes</Label>
                  <Textarea id="newLocationNotes" value={newLocationNotes} onChange={(e) => setNewLocationNotes(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Button
                onClick={continueWithLocation}
                disabled={
                  createLocationMutation.isPending ||
                  (locationMode === 'pick' ? !pickLocationId : !newLocationName)
                }
              >
                {createLocationMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  <span className="font-medium">{activeLocation?.name}</span>
                  {activeLocation?.latitude && activeLocation?.longitude && (
                    <span className="text-muted-foreground">
                      ({activeLocation.latitude}, {activeLocation.longitude})
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="self-start text-sm text-muted-foreground hover:underline sm:self-auto"
                onClick={() => setPhase('location')}
              >
                Change Location
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Equipment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center rounded-md border p-0.5 w-fit">
                <Button variant={mode === 'pick' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('pick')}>
                  <ListPlus className="size-4" />
                  Existing Equipment
                </Button>
                <Button
                  variant={mode === 'create' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('create')}
                >
                  <PackagePlus className="size-4" />
                  New Equipment
                </Button>
              </div>

              {mode === 'pick' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    checkInExistingMutation.mutate()
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pickResourceTypeId">Equipment Type</Label>
                      <Select
                        value={pickResourceTypeId}
                        onValueChange={(value) => {
                          setPickResourceTypeId(value)
                          setPickResourceId('')
                        }}
                      >
                        <SelectTrigger id="pickResourceTypeId">
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
                      <Label htmlFor="pickResourceId">Equipment</Label>
                      <Select value={pickResourceId} onValueChange={setPickResourceId} disabled={!pickResourceTypeId}>
                        <SelectTrigger id="pickResourceId">
                          <SelectValue
                            placeholder={
                              !pickResourceTypeId
                                ? 'Pick a type first'
                                : availableResourcesOfPickedType.length
                                  ? 'Select equipment'
                                  : 'None available of this type'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableResourcesOfPickedType.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.identifier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pickNotes">Notes</Label>
                    <Textarea id="pickNotes" value={pickNotes} onChange={(e) => setPickNotes(e.target.value)} />
                  </div>
                  <div>
                    <Button type="submit" disabled={!pickResourceId || checkInExistingMutation.isPending}>
                      Add to Deployment
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    createAndCheckInMutation.mutate()
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="resourceTypeId">Equipment Type</Label>
                      <Select
                        value={newResource.resourceTypeId}
                        onValueChange={(value) => {
                          setNewResource({ ...newResource, resourceTypeId: value })
                          setCustomFields({})
                        }}
                      >
                        <SelectTrigger id="resourceTypeId">
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
                      <Label htmlFor="identifier">Identifier</Label>
                      <Input
                        id="identifier"
                        value={newResource.identifier}
                        onChange={(e) => setNewResource({ ...newResource, identifier: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={newResource.serialNumber}
                        onChange={(e) => setNewResource({ ...newResource, serialNumber: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ownerId">Owner</Label>
                      {canAssignOwner ? (
                        <Select
                          value={newResource.ownerId || NONE}
                          onValueChange={(value) =>
                            setNewResource({ ...newResource, ownerId: value === NONE ? '' : value })
                          }
                        >
                          <SelectTrigger id="ownerId">
                            <SelectValue placeholder={me?.callsign ?? 'Select owner'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{me?.callsign ?? 'Me'}</SelectItem>
                            {operators?.map((op) => (
                              <SelectItem key={op.id} value={String(op.id)}>
                                {op.callsign}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={me?.callsign ?? ''} disabled />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newResourceNotes">Notes</Label>
                    <Textarea
                      id="newResourceNotes"
                      value={newResource.notes}
                      onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                    />
                  </div>

                  {selectedType && (
                    <CustomFieldInputs fields={selectedType.fields} values={customFields} onChange={setCustomFields} />
                  )}

                  <div>
                    <Button
                      type="submit"
                      disabled={createAndCheckInMutation.isPending || !newResource.resourceTypeId || !newResource.identifier || !me}
                    >
                      Add to Deployment
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {addedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Deployed Here
                  <span className="ml-2 text-muted-foreground font-normal text-sm">({addedItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1">
                  {addedItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <span className="font-medium">{item.resourceIdentifier}</span>
                      <span className="text-muted-foreground">({item.resourceTypeName})</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                        title="Remove — this was added by mistake"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(item.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div>
            <Button variant="outline" onClick={() => navigate(`/incidents/${id}`)}>
              Done
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
