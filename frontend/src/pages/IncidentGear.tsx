import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident, Resource, ResourceCheckIn } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function IncidentGear() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInId, setCheckInId] = useState('')
  const [checkInNotes, setCheckInNotes] = useState('')

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  const checkInMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/resource-checkins`, {
        resourceId: Number(checkInId),
        notes: checkInNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment checked in')
      setCheckInOpen(false)
      setCheckInId('')
      setCheckInNotes('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to check in resource'
      toast.error(message)
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: async (checkInId: number) => api.post(`/api/incidents/${id}/resource-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment checked out')
    },
    onError: () => toast.error('Failed to check out resource'),
  })

  if (!incident) return null

  const canEdit = incident.canEdit
  const isClosed = incident.status === 'CLOSED'
  const openResourceCheckIns = resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const checkedInResourceIds = new Set(openResourceCheckIns.map((c) => c.resourceId))
  const availableResources = resources?.filter((r) => !checkedInResourceIds.has(r.id)) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to {incident.name}
        </Button>
        <h1 className="text-2xl font-semibold">Gear &amp; Equipment</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Currently Deployed
            <span className="ml-2 text-muted-foreground font-normal text-sm">({openResourceCheckIns.length} deployed)</span>
          </CardTitle>
          {!isClosed && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canEdit}
                title={canEdit ? 'Deploy gear at a GPS location' : 'Requires edit access to this incident'}
                onClick={() => navigate(`/incidents/${id}/deploy`)}
              >
                <MapPin className="size-4" />
                Deploy Gear
              </Button>
              <Button
                size="sm"
                disabled={!canEdit}
                title={canEdit ? 'Check in equipment' : 'Requires edit access to this incident'}
                onClick={() => setCheckInOpen(true)}
              >
                <LogIn className="size-4" />
                Check In
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Checked In</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openResourceCheckIns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No equipment checked in yet.
                  </TableCell>
                </TableRow>
              )}
              {openResourceCheckIns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.resourceIdentifier}</TableCell>
                  <TableCell>{c.resourceTypeName}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(c.checkedInAt).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{c.notes || '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.latitude && c.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
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
                    <Button variant="ghost" size="sm" onClick={() => checkOutMutation.mutate(c.id)}>
                      <LogOut className="size-4" />
                      Check Out
                    </Button>
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
                <TableHead>Notes</TableHead>
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
                  <TableCell className="font-medium">{c.resourceIdentifier}</TableCell>
                  <TableCell>{c.resourceTypeName}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(c.checkedInAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.checkedOutAt ? new Date(c.checkedOutAt).toLocaleString() : <Badge variant="default">On Scene</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{c.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Equipment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInResourceId">Equipment</Label>
              <Select value={checkInId} onValueChange={setCheckInId}>
                <SelectTrigger id="checkInResourceId">
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
              <Label htmlFor="checkInResourceNotes">Notes</Label>
              <Textarea id="checkInResourceNotes" value={checkInNotes} onChange={(e) => setCheckInNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!checkInId || checkInMutation.isPending}>
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
