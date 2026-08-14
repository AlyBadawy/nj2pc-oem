import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Crosshair, ListPlus, Loader2, MapPin, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident, Operator, Resource, ResourceCheckIn, ResourceType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomFieldInputs, type CustomFieldValues } from '@/components/CustomFieldInputs'

type Coords = { lat: string; lng: string }
type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'

type NewResourceForm = {
  resourceTypeId: string
  identifier: string
  serialNumber: string
  notes: string
}

const emptyNewResourceForm: NewResourceForm = {
  resourceTypeId: '',
  identifier: '',
  serialNumber: '',
  notes: '',
}

export function DeployGear() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<'capture' | 'add'>('capture')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [showManual, setShowManual] = useState(false)

  const [mode, setMode] = useState<'pick' | 'create'>('pick')
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
    enabled: mode === 'create',
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

  const checkInExistingMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<ResourceCheckIn>(`/api/incidents/${id}/resource-checkins`, {
          resourceId: Number(pickResourceId),
          notes: pickNotes || null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        })
      ).data,
    onSuccess: (checkIn) => {
      setAddedItems((items) => [checkIn, ...items])
      setPickResourceId('')
      setPickNotes('')
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      toast.success(`${checkIn.resourceIdentifier} deployed`)
    },
    onError: () => toast.error('Failed to check in equipment'),
  })

  const createAndCheckInMutation = useMutation({
    mutationFn: async () => {
      const resource = (
        await api.post<Resource>('/api/resources', {
          resourceTypeId: Number(newResource.resourceTypeId),
          identifier: newResource.identifier,
          serialNumber: newResource.serialNumber || null,
          ownerId: me?.id ?? null,
          notes: newResource.notes || null,
          customFields,
        })
      ).data
      try {
        return (
          await api.post<ResourceCheckIn>(`/api/incidents/${id}/resource-checkins`, {
            resourceId: resource.id,
            notes: newResource.notes || null,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
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

      {phase === 'capture' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where are you deploying this equipment?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              size="lg"
              disabled={geoStatus === 'locating'}
              onClick={captureLocation}
              className="w-full sm:w-auto"
            >
              {geoStatus === 'locating' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Crosshair className="size-4" />
              )}
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

            <div>
              <Button onClick={() => setPhase('add')}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {coords ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary" />
                    {coords.lat}, {coords.lng}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No location set</span>
                )}
              </div>
              <button
                type="button"
                className="self-start text-sm text-muted-foreground hover:underline sm:self-auto"
                onClick={() => setPhase('capture')}
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
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pickResourceId">Equipment</Label>
                    <Select value={pickResourceId} onValueChange={setPickResourceId}>
                      <SelectTrigger id="pickResourceId">
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableResources.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.identifier} ({r.resourceTypeName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Label>Owner</Label>
                      <Input value={me?.callsign ?? ''} disabled />
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
                <ul className="flex flex-col gap-2">
                  {addedItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <span className="font-medium">{item.resourceIdentifier}</span>
                      <span className="text-muted-foreground">({item.resourceTypeName})</span>
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
