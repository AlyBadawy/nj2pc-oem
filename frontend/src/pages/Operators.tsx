import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatCallookLicenseClass, formatCallookName, lookupCallsign } from '@/lib/callook'
import type { Operator, OperatorStatus } from '@/lib/types'
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

type FormState = {
  callsign: string
  name: string
  licenseClass: string
  dmrIds: string[]
  phone: string
  email: string
  status: OperatorStatus
  notes: string
  addressLine1: string
  addressLine2: string
  addressAttn: string
  latitude: string
  longitude: string
  gridSquare: string
}

const emptyForm: FormState = {
  callsign: '',
  name: '',
  licenseClass: '',
  dmrIds: [],
  phone: '',
  email: '',
  status: 'ACTIVE',
  notes: '',
  addressLine1: '',
  addressLine2: '',
  addressAttn: '',
  latitude: '',
  longitude: '',
  gridSquare: '',
}

export function Operators() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Operator | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [lookupLoading, setLookupLoading] = useState(false)

  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, dmrIds: form.dmrIds.map((d) => d.trim()).filter(Boolean) }
      if (editing) {
        return api.put(`/api/operators/${editing.id}`, payload)
      }
      return api.post('/api/operators', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success(editing ? 'Operator updated' : 'Operator created')
      setDialogOpen(false)
    },
    onError: () => toast.error('Failed to save operator'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator removed')
    },
    onError: () => toast.error('Failed to delete operator'),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(operator: Operator) {
    setEditing(operator)
    setForm({
      callsign: operator.callsign,
      name: operator.name,
      licenseClass: operator.licenseClass ?? '',
      dmrIds: operator.dmrIds.length > 0 ? operator.dmrIds : [],
      phone: operator.phone ?? '',
      email: operator.email ?? '',
      status: operator.status,
      notes: operator.notes ?? '',
      addressLine1: operator.addressLine1 ?? '',
      addressLine2: operator.addressLine2 ?? '',
      addressAttn: operator.addressAttn ?? '',
      latitude: operator.latitude ?? '',
      longitude: operator.longitude ?? '',
      gridSquare: operator.gridSquare ?? '',
    })
    setDialogOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  async function handleCallsignBlur() {
    if (editing || !form.callsign.trim()) return
    setLookupLoading(true)
    const result = await lookupCallsign(form.callsign)
    setLookupLoading(false)

    if (!result || result.status !== 'VALID' || result.type !== 'PERSON') {
      if (result) {
        toast.info('Callsign not found in FCC database — enter details manually.')
      }
      return
    }

    setForm((f) => ({
      ...f,
      name: result.name ? formatCallookName(result.name) : f.name,
      licenseClass: result.current?.operClass
        ? formatCallookLicenseClass(result.current.operClass)
        : f.licenseClass,
      addressLine1: result.address?.line1 || f.addressLine1,
      addressLine2: result.address?.line2 || f.addressLine2,
      addressAttn: result.address?.attn || f.addressAttn,
      latitude: result.location?.latitude || f.latitude,
      longitude: result.location?.longitude || f.longitude,
      gridSquare: result.location?.gridsquare || f.gridSquare,
    }))
    toast.success('Auto-filled from FCC database — review before saving.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operators</h1>
          <p className="text-muted-foreground text-sm">Registered operator roster.</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Register Operator
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Callsign</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>License</TableHead>
                <TableHead>DMR ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {operators?.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.callsign}</TableCell>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op.licenseClass || '—'}</TableCell>
                  <TableCell>{op.dmrIds.length > 0 ? op.dmrIds.join(', ') : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {op.phone || op.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(op)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(op.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Operator' : 'Register Operator'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="callsign" className="flex items-center gap-1.5">
                  Callsign
                  {lookupLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input
                  id="callsign"
                  value={form.callsign}
                  onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
                  onBlur={handleCallsignBlur}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenseClass">License Class</Label>
                <Input
                  id="licenseClass"
                  value={form.licenseClass}
                  onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>DMR ID{form.dmrIds.length > 1 ? 's' : ''}</Label>
              {form.dmrIds.length === 0 && (
                <p className="text-sm text-muted-foreground">No DMR IDs added yet.</p>
              )}
              {form.dmrIds.map((dmrId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={dmrId}
                    onChange={(e) => {
                      const next = [...form.dmrIds]
                      next[index] = e.target.value
                      setForm({ ...form, dmrIds: next })
                    }}
                    placeholder="3123456"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setForm({ ...form, dmrIds: form.dmrIds.filter((_, i) => i !== index) })}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setForm({ ...form, dmrIds: [...form.dmrIds, ''] })}
              >
                <Plus className="size-4" />
                Add DMR ID
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: OperatorStatus) => setForm({ ...form, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="pt-1 border-t">
              <p className="text-sm font-medium pt-3 pb-1">Address</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine1">Street</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addressLine2">City, State ZIP</Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addressAttn">Attn</Label>
                <Input
                  id="addressAttn"
                  value={form.addressAttn}
                  onChange={(e) => setForm({ ...form, addressAttn: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-1 border-t">
              <p className="text-sm font-medium pt-3 pb-1">Location</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="40.8915158"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="-74.1959347"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gridSquare">Grid Square</Label>
                <Input
                  id="gridSquare"
                  value={form.gridSquare}
                  onChange={(e) => setForm({ ...form, gridSquare: e.target.value })}
                  placeholder="FN20vv"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? 'Save Changes' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
