import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import type { ChannelMode, CommunicationChannel, CommunicationPlan } from '@/lib/types'
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
  DialogDescription,
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

type PlanFormState = {
  name: string
  preparedByName: string
  preparedByCallsign: string
  specialInstructions: string
}

export function CommsPlanDetail() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'COMMS_PLAN_MANAGE')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [channelDialogOpen, setChannelDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<CommunicationChannel | null>(null)
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false)
  const [planForm, setPlanForm] = useState<PlanFormState>({
    name: '',
    preparedByName: '',
    preparedByCallsign: '',
    specialInstructions: '',
  })

  const { data: plan } = useQuery({
    queryKey: ['comms-plans', id],
    queryFn: async () => (await api.get<CommunicationPlan>(`/api/comms-plans/${id}`)).data,
  })

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['comms-plans', id, 'channels'],
    queryFn: async () => (await api.get<CommunicationChannel[]>(`/api/comms-plans/${id}/channels`)).data,
  })

  const { data: versions } = useQuery({
    queryKey: ['comms-plans', id, 'versions'],
    queryFn: async () => (await api.get<CommunicationPlan[]>(`/api/comms-plans/${id}/versions`)).data,
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

  const deletePlanMutation = useMutation({
    mutationFn: async () => api.delete(`/api/comms-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans'] })
      toast.success('Communications plan deleted')
      navigate('/comms-plans')
    },
    onError: () => toast.error('Failed to delete communications plan'),
  })

  const updatePlanMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/comms-plans/${id}`, {
        name: planForm.name,
        preparedByName: planForm.preparedByName || null,
        preparedByCallsign: planForm.preparedByCallsign || null,
        preparedAt: planForm.preparedByName ? new Date().toISOString() : null,
        specialInstructions: planForm.specialInstructions || null,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans'] })
      toast.success('Communications plan updated — new version created')
      setEditPlanDialogOpen(false)
      navigate(`/comms-plans/${response.data.id}`)
    },
    onError: () => toast.error('Failed to update communications plan'),
  })

  function openEditPlan() {
    if (!plan) return
    setPlanForm({
      name: plan.name,
      preparedByName: plan.preparedByName ?? '',
      preparedByCallsign: plan.preparedByCallsign ?? '',
      specialInstructions: plan.specialInstructions ?? '',
    })
    setEditPlanDialogOpen(true)
  }

  function handlePlanSubmit(e: FormEvent) {
    e.preventDefault()
    updatePlanMutation.mutate()
  }

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

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      const response = await api.get(`/api/comms-plans/${id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `ICS-205-${(plan?.name ?? 'plan').replace(/[^a-zA-Z0-9-]+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!plan) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/comms-plans')} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Communications Plans
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{plan.name}</h1>
            <Badge variant="outline">v{plan.version}</Badge>
            {!plan.active && <Badge variant="destructive">Superseded</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!canManage}
              title={canManage ? 'Edit plan' : 'Requires Manage Comms Plans permission'}
              onClick={openEditPlan}
            >
              <Pencil className="size-4" />
              Edit Plan
            </Button>
            <Button variant="outline" disabled={downloadingPdf} onClick={handleDownloadPdf}>
              {downloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={!canManage}
              title={canManage ? 'Delete plan' : 'Requires Manage Comms Plans permission'}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
        {(plan.preparedByCallsign || plan.preparedByName) && (
          <p className="text-muted-foreground text-sm">
            Prepared by {plan.preparedByName} {plan.preparedByCallsign && `(${plan.preparedByCallsign})`}
          </p>
        )}
        {plan.specialInstructions && (
          <p className="mt-3 text-sm max-w-2xl whitespace-pre-wrap">{plan.specialInstructions}</p>
        )}
      </div>

      {versions && versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-sm">
                  <Link
                    to={`/comms-plans/${v.id}`}
                    className={cn('hover:underline', v.id === plan.id && 'font-semibold')}
                  >
                    v{v.version} — {v.name}
                  </Link>
                  {v.active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Superseded</Badge>
                  )}
                  {v.id === plan.id && <span className="text-muted-foreground">(viewing)</span>}
                  <span className="text-muted-foreground text-xs">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Basic Radio Channel Utilization</CardTitle>
          <Button
            size="sm"
            disabled={!canManage}
            title={canManage ? 'Add channel' : 'Requires Manage Comms Plans permission'}
            onClick={openCreateChannel}
          >
            <Plus className="size-4" />
            Add Channel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Zone</TableHead>
                  <TableHead className="w-10">Ch#</TableHead>
                  <TableHead className="w-24">Function</TableHead>
                  <TableHead className="w-36">Channel Name</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead className="w-28">RX Freq</TableHead>
                  <TableHead className="w-28">TX Freq</TableHead>
                  <TableHead className="w-14">Mode</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
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
                {channels?.length === 0 && !channelsLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No channels added yet.
                    </TableCell>
                  </TableRow>
                )}
                {channels?.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>{channel.zoneGroup}</TableCell>
                    <TableCell>{channel.channelNumber}</TableCell>
                    <TableCell>{channel.function}</TableCell>
                    <TableCell className="font-medium whitespace-normal break-words">{channel.channelName}</TableCell>
                    <TableCell className="whitespace-normal break-words">{channel.assignment || '—'}</TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {channel.rxFrequency || '—'}
                      {channel.rxTone && <div className="text-xs text-muted-foreground">{channel.rxTone}</div>}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {channel.txFrequency || '—'}
                      {channel.txTone && <div className="text-xs text-muted-foreground">{channel.txTone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{modeLabel[channel.mode]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words text-muted-foreground text-sm">
                      {channel.remarks || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canManage}
                        title={canManage ? 'Edit channel' : 'Requires Manage Comms Plans permission'}
                        onClick={() => openEditChannel(channel)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canManage}
                        title={canManage ? 'Delete channel' : 'Requires Manage Comms Plans permission'}
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
                <Label htmlFor="zoneGroup">Zone</Label>
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

      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Communications Plan</DialogTitle>
            <DialogDescription>
              Saving creates a new version of this plan and marks the current version as superseded.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePlanSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planName">Name</Label>
              <Input
                id="planName"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="planPreparedByName">Prepared By</Label>
                <Input
                  id="planPreparedByName"
                  value={planForm.preparedByName}
                  onChange={(e) => setPlanForm({ ...planForm, preparedByName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="planPreparedByCallsign">Callsign</Label>
                <Input
                  id="planPreparedByCallsign"
                  value={planForm.preparedByCallsign}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, preparedByCallsign: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planSpecialInstructions">Special Instructions</Label>
              <Textarea
                id="planSpecialInstructions"
                value={planForm.specialInstructions}
                onChange={(e) => setPlanForm({ ...planForm, specialInstructions: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updatePlanMutation.isPending}>
                Save New Version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Communications Plan</DialogTitle>
            <DialogDescription>
              This will permanently delete "{plan.name}" and all of its channels. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletePlanMutation.isPending}
              onClick={() => deletePlanMutation.mutate()}
            >
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
