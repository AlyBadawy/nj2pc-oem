import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, LogIn, LogOut, Flag, Play, Pencil, ShieldCheck, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { tierRank } from '@/lib/roleTier'
import { incidentRef, type OperatorIdentityData } from '@/lib/identity'
import { OperatorIdentity } from '@/components/identity/OperatorIdentity'
import type {
  CommunicationPlan,
  Incident,
  IncidentCommsPlanApplication,
  IncidentLog,
  IncidentPermission,
  IncidentPermissionGrant,
  Operator,
  OperatorCheckIn,
  OperatorRole,
  Priority,
  Resource,
  ResourceCheckIn,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const statusVariant: Record<Incident['status'], 'default' | 'secondary' | 'destructive'> = {
  PLANNED: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'destructive',
}

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'destructive'> = {
  ROUTINE: 'secondary',
  PRIORITY: 'default',
  EMERGENCY: 'destructive',
}

type LogFormState = {
  operatorId: string
  toOperatorId: string
  subject: string
  message: string
  priority: Priority
}

const emptyLogForm: LogFormState = {
  operatorId: '',
  toOperatorId: '',
  subject: '',
  message: '',
  priority: 'ROUTINE',
}

export function IncidentDetail() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<LogFormState>(emptyLogForm)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [operatorCheckInOpen, setOperatorCheckInOpen] = useState(false)
  const [operatorCheckInId, setOperatorCheckInId] = useState('')
  const [operatorCheckInRoleId, setOperatorCheckInRoleId] = useState('')
  const [operatorCheckInPost, setOperatorCheckInPost] = useState('')
  const [operatorCheckInNotes, setOperatorCheckInNotes] = useState('')
  const [resourceCheckInOpen, setResourceCheckInOpen] = useState(false)
  const [resourceCheckInId, setResourceCheckInId] = useState('')
  const [resourceCheckInNotes, setResourceCheckInNotes] = useState('')
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [grantOperatorId, setGrantOperatorId] = useState('')
  const [grantPermission, setGrantPermission] = useState<IncidentPermission>('VIEW')
  const [applyCommsPlanOpen, setApplyCommsPlanOpen] = useState(false)
  const [applyCommsPlanId, setApplyCommsPlanId] = useState('')
  const [downloadingCommsPlanPdf, setDownloadingCommsPlanPdf] = useState(false)

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['incidents', id, 'logs'],
    queryFn: async () => (await api.get<IncidentLog[]>(`/api/incidents/${id}/logs`)).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: hasPermission(user, 'OPERATOR_LIST'),
  })

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => (await api.get<Resource[]>('/api/resources')).data,
  })

  const { data: operatorRoles } = useQuery({
    queryKey: ['operator-roles'],
    queryFn: async () => (await api.get<OperatorRole[]>('/api/operator-roles')).data,
  })

  const { data: operatorCheckIns } = useQuery({
    queryKey: ['incidents', id, 'operator-checkins'],
    queryFn: async () => (await api.get<OperatorCheckIn[]>(`/api/incidents/${id}/operator-checkins`)).data,
  })

  const { data: resourceCheckIns } = useQuery({
    queryKey: ['incidents', id, 'resource-checkins'],
    queryFn: async () => (await api.get<ResourceCheckIn[]>(`/api/incidents/${id}/resource-checkins`)).data,
  })

  const { data: permissionGrants } = useQuery({
    queryKey: ['incidents', id, 'permissions'],
    queryFn: async () => (await api.get<IncidentPermissionGrant[]>(`/api/incidents/${id}/permissions`)).data,
    enabled: !!incident?.canEdit,
  })

  const { data: activeCommsPlan } = useQuery({
    queryKey: ['incidents', id, 'comms-plan-active'],
    queryFn: async () => {
      const res = await api.get<IncidentCommsPlanApplication | null>(`/api/incidents/${id}/comms-plan-applications/active`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      return res.status === 204 ? null : res.data
    },
  })

  const { data: commsPlanHistory } = useQuery({
    queryKey: ['incidents', id, 'comms-plan-history'],
    queryFn: async () => (await api.get<IncidentCommsPlanApplication[]>(`/api/incidents/${id}/comms-plan-applications`)).data,
  })

  const { data: availableCommsPlans } = useQuery({
    queryKey: ['comms-plans', 'active'],
    queryFn: async () => (await api.get<CommunicationPlan[]>('/api/comms-plans', { params: { active: true } })).data,
  })

  const { data: lastRole } = useQuery({
    queryKey: ['operators', operatorCheckInId, 'last-role'],
    queryFn: async () => {
      const res = await api.get<{ roleId: number; roleName: string } | null>(`/api/operators/${operatorCheckInId}/last-role`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      return res.status === 204 ? null : res.data
    },
    enabled: !!operatorCheckInId,
  })

  useEffect(() => {
    if (lastRole && !operatorCheckInRoleId) {
      setOperatorCheckInRoleId(String(lastRole.roleId))
    }
  }, [lastRole])

  const createLogMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/logs`, {
        operatorId: Number(form.operatorId),
        toOperatorId: form.toOperatorId ? Number(form.toOperatorId) : null,
        subject: form.subject,
        message: form.message,
        priority: form.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'logs'] })
      toast.success('Log entry added')
      setDialogOpen(false)
      setForm(emptyLogForm)
    },
    onError: () => toast.error('Failed to add log entry'),
  })

  const checkInOperatorMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/operator-checkins`, {
        operatorId: Number(operatorCheckInId),
        roleId: operatorCheckInRoleId ? Number(operatorCheckInRoleId) : null,
        post: operatorCheckInPost || null,
        notes: operatorCheckInNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked in')
      setOperatorCheckInOpen(false)
      setOperatorCheckInId('')
      setOperatorCheckInRoleId('')
      setOperatorCheckInPost('')
      setOperatorCheckInNotes('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to check in operator'
      toast.error(message)
    },
  })

  const checkOutOperatorMutation = useMutation({
    mutationFn: async (checkInId: number) =>
      api.post(`/api/incidents/${id}/operator-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked out')
    },
    onError: () => toast.error('Failed to check out operator'),
  })

  const checkInResourceMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/resource-checkins`, {
        resourceId: Number(resourceCheckInId),
        notes: resourceCheckInNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment checked in')
      setResourceCheckInOpen(false)
      setResourceCheckInId('')
      setResourceCheckInNotes('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to check in resource'
      toast.error(message)
    },
  })

  const checkOutResourceMutation = useMutation({
    mutationFn: async (checkInId: number) =>
      api.post(`/api/incidents/${id}/resource-checkins/${checkInId}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment checked out')
    },
    onError: () => toast.error('Failed to check out resource'),
  })

  const startIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident started')
    },
    onError: () => toast.error('Failed to start incident'),
  })

  const endIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'resource-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Incident ended — all operators and resources checked out')
      setEndDialogOpen(false)
    },
    onError: () => toast.error('Failed to end incident'),
  })

  const addGrantMutation = useMutation({
    mutationFn: async () => {
      const existing = (permissionGrants ?? []).map((g) => ({ operatorId: g.operatorId, permission: g.permission }))
      const grants = [...existing, { operatorId: Number(grantOperatorId), permission: grantPermission }]
      return api.put(`/api/incidents/${id}/permissions`, { grants })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'permissions'] })
      toast.success('Permission granted')
      setGrantOperatorId('')
    },
    onError: () => toast.error('Failed to grant permission'),
  })

  const revokeGrantMutation = useMutation({
    mutationFn: async (target: { operatorId: number; permission: IncidentPermission }) => {
      const grants = (permissionGrants ?? [])
        .filter((g) => !(g.operatorId === target.operatorId && g.permission === target.permission))
        .map((g) => ({ operatorId: g.operatorId, permission: g.permission }))
      return api.put(`/api/incidents/${id}/permissions`, { grants })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'permissions'] })
      toast.success('Permission revoked')
    },
    onError: () => toast.error('Failed to revoke permission'),
  })

  const applyCommsPlanMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/comms-plan-applications`, { communicationPlanId: Number(applyCommsPlanId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-active'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-history'] })
      toast.success('Communications plan applied')
      setApplyCommsPlanOpen(false)
      setApplyCommsPlanId('')
    },
    onError: () => toast.error('Failed to apply communications plan'),
  })

  const revokeCommsPlanMutation = useMutation({
    mutationFn: async (applicationId: number) => api.post(`/api/incidents/${id}/comms-plan-applications/${applicationId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-active'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-history'] })
      toast.success('Communications plan revoked')
    },
    onError: () => toast.error('Failed to revoke communications plan'),
  })

  async function handleDownloadCommsPlanPdf() {
    if (!activeCommsPlan) return
    setDownloadingCommsPlanPdf(true)
    try {
      const response = await api.get(`/api/comms-plans/${activeCommsPlan.communicationPlanId}/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `ICS-205-${activeCommsPlan.planName.replace(/[^a-zA-Z0-9-]+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingCommsPlanPdf(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createLogMutation.mutate()
  }

  if (!incident) return null

  const canEdit = incident.canEdit
  const openOperatorCheckIns = operatorCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const tileData = [...openOperatorCheckIns]
    .sort((a, b) => tierRank(b.roleAccessLevel) - tierRank(a.roleAccessLevel) || a.checkedInAt.localeCompare(b.checkedInAt))
    .map((c): OperatorIdentityData => {
      const op = operators?.find((o) => o.id === c.operatorId)
      return {
        id: c.operatorId,
        callsign: c.operatorCallsign,
        name: op?.name ?? c.operatorCallsign,
        licenseClass: op?.licenseClass ?? null,
        role: c.roleName,
        roleColor: c.roleColor,
        roleAccessLevel: c.roleAccessLevel,
        canViewContact: false,
        phone: null,
        email: null,
        assignment: c.post,
        checkedInAt: c.checkedInAt,
      }
    })
  const openResourceCheckIns = resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? []
  const checkedInOperatorIds = new Set(openOperatorCheckIns.map((c) => c.operatorId))
  const checkedInResourceIds = new Set(openResourceCheckIns.map((c) => c.resourceId))
  const availableOperators = operators?.filter((o) => !checkedInOperatorIds.has(o.id)) ?? []
  const availableResources = resources?.filter((r) => !checkedInResourceIds.has(r.id)) ?? []
  const isClosed = incident.status === 'CLOSED'
  const isPlanned = incident.status === 'PLANNED'
  const isActive = incident.status === 'ACTIVE'

  const fmt = (v: string | null) =>
    v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Incidents
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{incident.name}</h1>
              <Badge variant={statusVariant[incident.status]}>{incident.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{incident.location}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setPermissionsOpen(true)}>
                <ShieldCheck className="size-4" />
                Permissions
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!canEdit || isClosed}
              title={canEdit ? 'Edit incident' : 'Requires edit access to this incident'}
              onClick={() => navigate(`/incidents/${id}/edit`)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            {isPlanned && (
              <Button
                variant="outline"
                disabled={!canEdit || startIncidentMutation.isPending}
                title={canEdit ? 'Start incident' : 'Requires edit access to this incident'}
                onClick={() => startIncidentMutation.mutate()}
              >
                <Play className="size-4" />
                Start Incident
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                disabled={!canEdit}
                title={canEdit ? 'End incident' : 'Requires edit access to this incident'}
                onClick={() => setEndDialogOpen(true)}
              >
                <Flag className="size-4" />
                End Incident
              </Button>
            )}
          </div>
        </div>
        {incident.description && <p className="mt-3 text-sm max-w-2xl">{incident.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-muted-foreground">
          <span>
            Planned: {fmt(incident.plannedStartTime)} – {fmt(incident.plannedEndTime)}
          </span>
          <span>
            Actual: {fmt(incident.actualStartTime)} – {fmt(incident.actualEndTime)}
          </span>
          {canEdit && (
            <span>
              Created by {incident.createdByCallsign ?? 'System'} at{' '}
              {new Date(incident.createdAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {!isClosed && (
        <div className="overflow-hidden rounded-lg bg-credential-paper-edge">
          <div className="flex items-center justify-between gap-3 bg-credential-ink px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="credential-micro !text-white/50">
                {isActive ? 'Active Incident' : 'Planned Incident'} · {incidentRef(incident.id, incident.createdAt)}
              </div>
              <div className="truncate text-[15px] font-semibold">{incident.name}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-2 font-credential-mono text-[11px] text-white/85">
                <span className="relative inline-flex size-2.5">
                  <span
                    className="absolute inline-flex size-full rounded-full opacity-60"
                    style={{ background: 'var(--credential-blue-soft)', boxShadow: '0 0 0 3px rgba(127,178,229,.25)' }}
                  />
                  <span
                    className="relative inline-flex size-full rounded-full"
                    style={{ background: 'var(--credential-blue-soft)' }}
                  />
                </span>
                {tileData.length} Checked In
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent text-white hover:bg-white/10 hover:text-white"
                disabled={!canEdit}
                title={canEdit ? 'Check in an operator' : 'Requires edit access to this incident'}
                onClick={() => setOperatorCheckInOpen(true)}
              >
                <LogIn className="size-4" />
                Check In
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {tileData.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full">No operators checked in yet.</p>
            )}
            {tileData.map((d) => (
              <OperatorIdentity
                key={d.id}
                variant="tile"
                data={d}
                onClick={() => navigate(`/operators/${d.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Currently Deployed Gear and Equipment
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({openResourceCheckIns.length} deployed)
            </span>
          </CardTitle>
          {!isClosed && (
            <Button size="sm" onClick={() => setResourceCheckInOpen(true)}>
              <LogIn className="size-4" />
              Check In
            </Button>
          )}
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
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(c.checkedInAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <Badge variant="default">On Scene</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => checkOutResourceMutation.mutate(c.id)}
                    >
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Message Log (ICS-213)</CardTitle>
          {!isClosed && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Log Entry
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(log.loggedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.operatorCallsign || '—'}</TableCell>
                  <TableCell>{log.toOperatorCallsign || '—'}</TableCell>
                  <TableCell className="font-medium">{log.subject}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[log.priority]}>{log.priority}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="operators">
            <TabsList>
              <TabsTrigger value="operators">
                Operators
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({operatorCheckIns?.length ?? 0})
                </span>
              </TabsTrigger>
              <TabsTrigger value="equipment">
                Gear &amp; Equipment
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({resourceCheckIns?.length ?? 0})
                </span>
              </TabsTrigger>
              <TabsTrigger value="comms-plan">Comms Plan</TabsTrigger>
            </TabsList>
            <TabsContent value="operators">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Callsign</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead>Checked In</TableHead>
                    <TableHead>Checked Out</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!operatorCheckIns || operatorCheckIns.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No operators checked in yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {operatorCheckIns?.map((c) => {
                    const canCheckOut = canEdit || c.operatorCallsign === user?.callsign
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link to={`/operators/${c.operatorId}`} className="hover:underline">
                            {c.operatorCallsign}
                          </Link>
                        </TableCell>
                        <TableCell>{c.roleName || '—'}</TableCell>
                        <TableCell>{c.post || '—'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(c.checkedInAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {c.checkedOutAt ? (
                            new Date(c.checkedOutAt).toLocaleString()
                          ) : (
                            <Badge variant="default">On Scene</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {c.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {!c.checkedOutAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canCheckOut}
                              title={canCheckOut ? 'Check out' : 'You may only check yourself out'}
                              onClick={() => checkOutOperatorMutation.mutate(c.id)}
                            >
                              <LogOut className="size-4" />
                              Check Out
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="equipment">
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
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(c.checkedInAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {c.checkedOutAt ? (
                          new Date(c.checkedOutAt).toLocaleString()
                        ) : (
                          <Badge variant="default">On Scene</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {c.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="comms-plan" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Current Plan</p>
                <div className="flex items-center gap-2">
                  {activeCommsPlan && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingCommsPlanPdf}
                      onClick={handleDownloadCommsPlanPdf}
                    >
                      {downloadingCommsPlanPdf ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Generate PDF
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canEdit}
                    title={canEdit ? 'Apply or change the communications plan' : 'Requires edit access to this incident'}
                    onClick={() => setApplyCommsPlanOpen(true)}
                  >
                    {activeCommsPlan ? 'Change Plan' : 'Apply Plan'}
                  </Button>
                </div>
              </div>

              {activeCommsPlan ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/comms-plans/${activeCommsPlan.communicationPlanId}`}
                        className="font-medium hover:underline"
                      >
                        {activeCommsPlan.planName}
                      </Link>
                      <Badge variant="secondary">v{activeCommsPlan.planVersion}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Applied {new Date(activeCommsPlan.appliedAt).toLocaleString()} by{' '}
                      {activeCommsPlan.appliedByCallsign ?? 'System'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canEdit}
                    title={canEdit ? 'Revoke this communications plan' : 'Requires edit access to this incident'}
                    onClick={() => revokeCommsPlanMutation.mutate(activeCommsPlan.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No communications plan applied.</p>
              )}

              {commsPlanHistory && commsPlanHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">History</p>
                  <ul className="flex flex-col gap-1">
                    {commsPlanHistory.map((h) => (
                      <li key={h.id}>
                        <Link
                          to={`/comms-plans/${h.communicationPlanId}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span className="font-medium">{h.planName}</span>
                          <Badge variant="outline">v{h.planVersion}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Log Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operatorId">From</Label>
                <Select
                  value={form.operatorId}
                  onValueChange={(value) => setForm({ ...form, operatorId: value })}
                >
                  <SelectTrigger id="operatorId">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="toOperatorId">To (optional)</Label>
                <Select
                  value={form.toOperatorId}
                  onValueChange={(value) => setForm({ ...form, toOperatorId: value })}
                >
                  <SelectTrigger id="toOperatorId">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value: Priority) => setForm({ ...form, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="PRIORITY">Priority</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createLogMutation.isPending || !form.operatorId}>
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={operatorCheckInOpen} onOpenChange={setOperatorCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Operator</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInOperatorMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorId">Operator</Label>
              <Select value={operatorCheckInId} onValueChange={setOperatorCheckInId}>
                <SelectTrigger id="checkInOperatorId">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((op) => (
                    <SelectItem key={op.id} value={String(op.id)}>
                      {op.callsign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkInOperatorRole">Role</Label>
                <Select value={operatorCheckInRoleId} onValueChange={setOperatorCheckInRoleId}>
                  <SelectTrigger id="checkInOperatorRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorRoles?.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkInOperatorPost">Post</Label>
                <Input
                  id="checkInOperatorPost"
                  value={operatorCheckInPost}
                  onChange={(e) => setOperatorCheckInPost(e.target.value)}
                  placeholder="Where this operator is deployed"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorNotes">Notes</Label>
              <Textarea
                id="checkInOperatorNotes"
                value={operatorCheckInNotes}
                onChange={(e) => setOperatorCheckInNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!operatorCheckInId || checkInOperatorMutation.isPending}
              >
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceCheckInOpen} onOpenChange={setResourceCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Equipment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInResourceMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInResourceId">Equipment</Label>
              <Select value={resourceCheckInId} onValueChange={setResourceCheckInId}>
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
              <Textarea
                id="checkInResourceNotes"
                value={resourceCheckInNotes}
                onChange={(e) => setResourceCheckInNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!resourceCheckInId || checkInResourceMutation.isPending}
              >
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={applyCommsPlanOpen} onOpenChange={setApplyCommsPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Communications Plan</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              applyCommsPlanMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="applyCommsPlanId">Plan</Label>
              <Select value={applyCommsPlanId} onValueChange={setApplyCommsPlanId}>
                <SelectTrigger id="applyCommsPlanId">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {availableCommsPlans?.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} (v{plan.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!applyCommsPlanId || applyCommsPlanMutation.isPending}
              >
                Apply
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Incident</DialogTitle>
            <DialogDescription>
              This will close "{incident.name}" and automatically check out{' '}
              {openOperatorCheckIns.length} operator{openOperatorCheckIns.length === 1 ? '' : 's'} and{' '}
              {openResourceCheckIns.length} piece{openResourceCheckIns.length === 1 ? '' : 's'} of equipment{' '}
              still on scene. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={endIncidentMutation.isPending}
              onClick={() => endIncidentMutation.mutate()}
            >
              End Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incident Permissions</DialogTitle>
            <DialogDescription>
              Grant operators VIEW or EDIT access to this specific incident.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {permissionGrants && permissionGrants.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {permissionGrants.map((g) => (
                  <li key={`${g.operatorId}-${g.permission}`} className="flex items-center justify-between text-sm">
                    <span>
                      {g.operatorCallsign} — <span className="text-muted-foreground">{g.permission}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revokeGrantMutation.isPending}
                      onClick={() => revokeGrantMutation.mutate({ operatorId: g.operatorId, permission: g.permission })}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No per-incident grants yet.</p>
            )}
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="grantOperator">Operator</Label>
                <Select value={grantOperatorId} onValueChange={setGrantOperatorId}>
                  <SelectTrigger id="grantOperator">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="grantPermission">Permission</Label>
                <Select value={grantPermission} onValueChange={(v: IncidentPermission) => setGrantPermission(v)}>
                  <SelectTrigger id="grantPermission" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW">VIEW</SelectItem>
                    <SelectItem value="EDIT">EDIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!grantOperatorId || addGrantMutation.isPending}
                onClick={() => addGrantMutation.mutate()}
              >
                Grant
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
