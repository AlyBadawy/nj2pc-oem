import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Incident, Operator, OperatorCheckIn, OperatorRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function toIso(localDateTime: string): string | null {
  return localDateTime ? new Date(localDateTime).toISOString() : null
}

function nowForInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function IncidentOperators() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInId, setCheckInId] = useState('')
  const [checkInRoleId, setCheckInRoleId] = useState('')
  const [checkInPost, setCheckInPost] = useState('')
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInAt, setCheckInAt] = useState('')
  const [checkOutTarget, setCheckOutTarget] = useState<OperatorCheckIn | null>(null)
  const [checkOutAt, setCheckOutAt] = useState('')

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: hasPermission(user, 'OPERATOR_LIST'),
  })

  const { data: operatorRoles } = useQuery({
    queryKey: ['operator-roles'],
    queryFn: async () => (await api.get<OperatorRole[]>('/api/operator-roles')).data,
  })

  const { data: operatorCheckIns } = useQuery({
    queryKey: ['incidents', id, 'operator-checkins'],
    queryFn: async () => (await api.get<OperatorCheckIn[]>(`/api/incidents/${id}/operator-checkins`)).data,
  })

  const { data: lastRole } = useQuery({
    queryKey: ['operators', checkInId, 'last-role'],
    queryFn: async () => {
      const res = await api.get<{ roleId: number; roleName: string } | null>(`/api/operators/${checkInId}/last-role`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      return res.status === 204 ? null : res.data
    },
    enabled: !!checkInId,
  })

  useEffect(() => {
    if (lastRole && !checkInRoleId) {
      setCheckInRoleId(String(lastRole.roleId))
    }
  }, [lastRole])

  const checkInMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/operator-checkins`, {
        operatorId: Number(checkInId),
        roleId: checkInRoleId ? Number(checkInRoleId) : null,
        post: checkInPost || null,
        notes: checkInNotes || null,
        checkedInAt: toIso(checkInAt),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked in')
      setCheckInOpen(false)
      setCheckInId('')
      setCheckInRoleId('')
      setCheckInPost('')
      setCheckInNotes('')
      setCheckInAt('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to check in operator'
      toast.error(message)
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/incidents/${id}/operator-checkins/${checkOutTarget?.id}/checkout`, {
        checkedOutAt: toIso(checkOutAt),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'operator-checkins'] })
      toast.success('Operator checked out')
      setCheckOutTarget(null)
      setCheckOutAt('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to check out operator'
      toast.error(message)
    },
  })

  const team = useMemo(() => {
    const byOperator = new Map<number, { operatorId: number; callsign: string }>()
    for (const c of operatorCheckIns ?? []) {
      if (!byOperator.has(c.operatorId)) {
        byOperator.set(c.operatorId, { operatorId: c.operatorId, callsign: c.operatorCallsign })
      }
    }
    return [...byOperator.values()].sort((a, b) => a.callsign.localeCompare(b.callsign))
  }, [operatorCheckIns])

  if (!incident) return null

  const canEdit = incident.canEdit
  const isClosed = incident.status === 'CLOSED'
  const checkedInOperatorIds = new Set((operatorCheckIns ?? []).filter((c) => !c.checkedOutAt).map((c) => c.operatorId))
  const availableOperators = operators?.filter((o) => !checkedInOperatorIds.has(o.id)) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to {incident.name}
        </Button>
        <h1 className="text-2xl font-semibold">Team, and timesheet</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Team
            <span className="ml-2 text-muted-foreground font-normal text-sm">({team.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <p className="text-muted-foreground text-sm">No operators have checked in to this incident yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {team.map((t) => (
                <Link key={t.operatorId} to={`/operators/${t.operatorId}`}>
                  <Badge variant="outline" className="hover:bg-accent">
                    {t.callsign}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Operator Check-Ins
            <span className="ml-2 text-muted-foreground font-normal text-sm">({operatorCheckIns?.length ?? 0})</span>
          </CardTitle>
          {!isClosed && (
            <Button
              size="sm"
              disabled={!canEdit}
              title={canEdit ? 'Check in an operator' : 'Requires edit access to this incident'}
              onClick={() => {
                setCheckInAt(nowForInput())
                setCheckInOpen(true)
              }}
            >
              <LogIn className="size-4" />
              Check In
            </Button>
          )}
        </CardHeader>
        <CardContent>
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
                    <TableCell className="text-sm whitespace-nowrap">{new Date(c.checkedInAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {c.checkedOutAt ? new Date(c.checkedOutAt).toLocaleString() : <Badge variant="default">On Scene</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{c.notes || '—'}</TableCell>
                    <TableCell className="text-right">
                      {!c.checkedOutAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canCheckOut}
                          title={canCheckOut ? 'Check out' : 'You may only check yourself out'}
                          onClick={() => {
                            setCheckOutTarget(c)
                            setCheckOutAt(nowForInput())
                          }}
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
        </CardContent>
      </Card>

      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Operator</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkInMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorId">Operator</Label>
              <Select value={checkInId} onValueChange={setCheckInId}>
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
                <Select value={checkInRoleId} onValueChange={setCheckInRoleId}>
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
                  value={checkInPost}
                  onChange={(e) => setCheckInPost(e.target.value)}
                  placeholder="Where this operator is deployed"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorNotes">Notes</Label>
              <Textarea id="checkInOperatorNotes" value={checkInNotes} onChange={(e) => setCheckInNotes(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkInOperatorTime">Check-In Time</Label>
              <Input
                id="checkInOperatorTime"
                type="datetime-local"
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!checkInId || checkInMutation.isPending}>
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkOutTarget} onOpenChange={(open) => !open && setCheckOutTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out {checkOutTarget?.operatorCallsign}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkOutMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkOutOperatorTime">Check-Out Time</Label>
              <Input
                id="checkOutOperatorTime"
                type="datetime-local"
                value={checkOutAt}
                onChange={(e) => setCheckOutAt(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={checkOutMutation.isPending}>
                Check Out
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
