import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Link as LinkIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ChannelMode, CommunicationChannel, CommunicationPlan, Incident } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ChannelFormState = {
  zoneGroup: string
  channelNumber: string
  function: string
  channelName: string
  assignment: string
  rxFrequency: string
  rxTone: string
  txFrequency: string
  txTone: string
  mode: ChannelMode
  remarks: string
}

const emptyChannelForm: ChannelFormState = {
  zoneGroup: '',
  channelNumber: '',
  function: '',
  channelName: '',
  assignment: '',
  rxFrequency: '',
  rxTone: '',
  txFrequency: '',
  txTone: '',
  mode: 'ANALOG',
  remarks: '',
}

const modeLabel: Record<ChannelMode, string> = {
  ANALOG: 'A',
  DIGITAL: 'D',
  MIXED: 'M',
}

export function CommsPlanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [channelDialogOpen, setChannelDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<CommunicationChannel | null>(null)
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm)
  const [linkIncidentId, setLinkIncidentId] = useState('')

  const { data: plan } = useQuery({
    queryKey: ['comms-plans', id],
    queryFn: async () => (await api.get<CommunicationPlan>(`/api/comms-plans/${id}`)).data,
  })

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['comms-plans', id, 'channels'],
    queryFn: async () => (await api.get<CommunicationChannel[]>(`/api/comms-plans/${id}/channels`)).data,
  })

  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<Incident[]>('/api/incidents')).data,
  })

  const saveChannelMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        zoneGroup: channelForm.zoneGroup,
        channelNumber: Number(channelForm.channelNumber),
        function: channelForm.function,
        channelName: channelForm.channelName,
        assignment: channelForm.assignment || null,
        rxFrequency: channelForm.rxFrequency || null,
        rxTone: channelForm.rxTone || null,
        txFrequency: channelForm.txFrequency || null,
        txTone: channelForm.txTone || null,
        mode: channelForm.mode,
        remarks: channelForm.remarks || null,
      }
      if (editingChannel) {
        return api.put(`/api/comms-plans/${id}/channels/${editingChannel.id}`, payload)
      }
      return api.post(`/api/comms-plans/${id}/channels`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans', id, 'channels'] })
      toast.success(editingChannel ? 'Channel updated' : 'Channel added')
      setChannelDialogOpen(false)
    },
    onError: () => toast.error('Failed to save channel'),
  })

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: number) => api.delete(`/api/comms-plans/${id}/channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans', id, 'channels'] })
      toast.success('Channel removed')
    },
    onError: () => toast.error('Failed to remove channel'),
  })

  const linkIncidentMutation = useMutation({
    mutationFn: async (incidentId: number) => api.post(`/api/comms-plans/${id}/incidents/${incidentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans', id] })
      toast.success('Incident linked')
      setLinkIncidentId('')
    },
    onError: () => toast.error('Failed to link incident'),
  })

  const unlinkIncidentMutation = useMutation({
    mutationFn: async (incidentId: number) => api.delete(`/api/comms-plans/${id}/incidents/${incidentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans', id] })
      toast.success('Incident unlinked')
    },
    onError: () => toast.error('Failed to unlink incident'),
  })

  function openCreateChannel() {
    setEditingChannel(null)
    setChannelForm(emptyChannelForm)
    setChannelDialogOpen(true)
  }

  function openEditChannel(channel: CommunicationChannel) {
    setEditingChannel(channel)
    setChannelForm({
      zoneGroup: channel.zoneGroup,
      channelNumber: String(channel.channelNumber),
      function: channel.function,
      channelName: channel.channelName,
      assignment: channel.assignment ?? '',
      rxFrequency: channel.rxFrequency ?? '',
      rxTone: channel.rxTone ?? '',
      txFrequency: channel.txFrequency ?? '',
      txTone: channel.txTone ?? '',
      mode: channel.mode,
      remarks: channel.remarks ?? '',
    })
    setChannelDialogOpen(true)
  }

  function handleChannelSubmit(e: FormEvent) {
    e.preventDefault()
    saveChannelMutation.mutate()
  }

  if (!plan) return null

  const linkedIds = new Set(plan.incidents.map((i) => i.id))
  const availableIncidents = incidents?.filter((i) => !linkedIds.has(i.id)) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/comms-plans')} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Communications Plans
        </Button>
        <h1 className="text-2xl font-semibold">{plan.name}</h1>
        {(plan.preparedByCallsign || plan.preparedByName) && (
          <p className="text-muted-foreground text-sm">
            Prepared by {plan.preparedByName} {plan.preparedByCallsign && `(${plan.preparedByCallsign})`}
          </p>
        )}
        {plan.specialInstructions && (
          <p className="mt-3 text-sm max-w-2xl whitespace-pre-wrap">{plan.specialInstructions}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked Incidents</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {plan.incidents.length === 0 && (
              <p className="text-sm text-muted-foreground">No incidents linked yet.</p>
            )}
            {plan.incidents.map((incident) => (
              <Badge key={incident.id} variant="secondary" className="gap-1 pr-1">
                {incident.name}
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  onClick={() => unlinkIncidentMutation.mutate(incident.id)}
                  aria-label={`Unlink ${incident.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select value={linkIncidentId} onValueChange={setLinkIncidentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select an incident to link" />
              </SelectTrigger>
              <SelectContent>
                {availableIncidents.map((incident) => (
                  <SelectItem key={incident.id} value={String(incident.id)}>
                    {incident.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!linkIncidentId || linkIncidentMutation.isPending}
              onClick={() => linkIncidentMutation.mutate(Number(linkIncidentId))}
            >
              <LinkIcon className="size-4" />
              Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Basic Radio Channel Utilization</CardTitle>
          <Button size="sm" onClick={openCreateChannel}>
            <Plus className="size-4" />
            Add Channel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone/Grp</TableHead>
                  <TableHead>Ch#</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>RX Freq</TableHead>
                  <TableHead>TX Freq</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelsLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {channels?.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>{channel.zoneGroup}</TableCell>
                    <TableCell>{channel.channelNumber}</TableCell>
                    <TableCell>{channel.function}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{channel.channelName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{channel.assignment || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {channel.rxFrequency || '—'}
                      {channel.rxTone && <div className="text-xs text-muted-foreground">{channel.rxTone}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {channel.txFrequency || '—'}
                      {channel.txTone && <div className="text-xs text-muted-foreground">{channel.txTone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{modeLabel[channel.mode]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                      {channel.remarks || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditChannel(channel)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteChannelMutation.mutate(channel.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add Channel'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChannelSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="zoneGroup">Zone/Grp</Label>
                <Input
                  id="zoneGroup"
                  value={channelForm.zoneGroup}
                  onChange={(e) => setChannelForm({ ...channelForm, zoneGroup: e.target.value })}
                  placeholder="Main"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="channelNumber">Ch #</Label>
                <Input
                  id="channelNumber"
                  type="number"
                  value={channelForm.channelNumber}
                  onChange={(e) => setChannelForm({ ...channelForm, channelNumber: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mode">Mode</Label>
                <Select
                  value={channelForm.mode}
                  onValueChange={(value: ChannelMode) => setChannelForm({ ...channelForm, mode: value })}
                >
                  <SelectTrigger id="mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANALOG">Analog</SelectItem>
                    <SelectItem value="DIGITAL">Digital</SelectItem>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="function">Function</Label>
                <Input
                  id="function"
                  value={channelForm.function}
                  onChange={(e) => setChannelForm({ ...channelForm, function: e.target.value })}
                  placeholder="Command/Tactical"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="channelName">Channel Name</Label>
                <Input
                  id="channelName"
                  value={channelForm.channelName}
                  onChange={(e) => setChannelForm({ ...channelForm, channelName: e.target.value })}
                  placeholder="NJ2PC DMR (Primary)"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignment">Assignment</Label>
              <Input
                id="assignment"
                value={channelForm.assignment}
                onChange={(e) => setChannelForm({ ...channelForm, assignment: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rxFrequency">RX Freq</Label>
                <Input
                  id="rxFrequency"
                  value={channelForm.rxFrequency}
                  onChange={(e) => setChannelForm({ ...channelForm, rxFrequency: e.target.value })}
                  placeholder="440.950"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rxTone">RX Tone/NAC</Label>
                <Input
                  id="rxTone"
                  value={channelForm.rxTone}
                  onChange={(e) => setChannelForm({ ...channelForm, rxTone: e.target.value })}
                  placeholder="CC1 / TS2 / TG Local 9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="txFrequency">TX Freq</Label>
                <Input
                  id="txFrequency"
                  value={channelForm.txFrequency}
                  onChange={(e) => setChannelForm({ ...channelForm, txFrequency: e.target.value })}
                  placeholder="445.950"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="txTone">TX Tone/NAC</Label>
                <Input
                  id="txTone"
                  value={channelForm.txTone}
                  onChange={(e) => setChannelForm({ ...channelForm, txTone: e.target.value })}
                  placeholder="CC1 / TS2 / TG Local 9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={channelForm.remarks}
                onChange={(e) => setChannelForm({ ...channelForm, remarks: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveChannelMutation.isPending}>
                {editingChannel ? 'Save Changes' : 'Add Channel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
