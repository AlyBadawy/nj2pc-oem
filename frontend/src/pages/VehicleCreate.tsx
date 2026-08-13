import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { US_STATES } from '@/lib/usStates'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FormState = {
  operatorId: string
  year: string
  make: string
  model: string
  color: string
  licensePlateNumber: string
  licensePlateState: string
  notes: string
}

function emptyForm(selfOperatorId: string): FormState {
  return {
    operatorId: selfOperatorId,
    year: '',
    make: '',
    model: '',
    color: '',
    licensePlateNumber: '',
    licensePlateState: '',
    notes: '',
  }
}

export function VehicleCreate({ forOthers = false }: { forOthers?: boolean }) {
  const { user } = useAuth()
  const canAssignOwner = hasPermission(user, 'RESOURCE_MANAGE_ALL') || hasPermission(user, 'RESOURCE_ASSIGN_OWNER')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (forOthers && !canAssignOwner) {
      navigate('/vehicles', { replace: true })
    }
  }, [forOthers, canAssignOwner, navigate])

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<Operator>('/api/auth/me')).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: forOthers && canAssignOwner,
  })

  const [form, setForm] = useState<FormState>(emptyForm(me ? String(me.id) : ''))

  const operatorId = forOthers ? form.operatorId || (me ? String(me.id) : '') : me ? String(me.id) : ''

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/operators/${operatorId}/vehicles`, {
        year: Number(form.year),
        make: form.make,
        model: form.model,
        color: form.color || null,
        licensePlateNumber: form.licensePlateNumber,
        licensePlateState: form.licensePlateState,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Vehicle added')
      navigate(forOthers ? '/all-vehicles' : '/vehicles')
    },
    onError: () => toast.error('Failed to add vehicle'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  if (forOthers && !canAssignOwner) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Vehicle</h1>
        <p className="text-muted-foreground text-sm">
          {forOthers ? 'Register a vehicle for an operator.' : 'Register a vehicle under your callsign.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {forOthers ? (
          <div className="flex flex-col gap-1.5 max-w-xs">
            <Label htmlFor="operatorId">Owner</Label>
            <Select value={operatorId} onValueChange={(value) => setForm({ ...form, operatorId: value })}>
              <SelectTrigger id="operatorId">
                <SelectValue placeholder="Select an operator" />
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
        ) : (
          <div className="flex flex-col gap-1.5 max-w-xs">
            <Label>Owner</Label>
            <Input value={user?.callsign ?? ''} disabled />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="make">Make</Label>
            <Input id="make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="licensePlateNumber">License Plate Number</Label>
            <Input
              id="licensePlateNumber"
              value={form.licensePlateNumber}
              onChange={(e) => setForm({ ...form, licensePlateNumber: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="licensePlateState">License Plate State</Label>
            <Select
              value={form.licensePlateState}
              onValueChange={(value) => setForm({ ...form, licensePlateState: value })}
            >
              <SelectTrigger id="licensePlateState">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div>
          <Button
            type="submit"
            disabled={createMutation.isPending || !operatorId || !form.licensePlateState}
          >
            Add Vehicle
          </Button>
        </div>
      </form>
    </div>
  )
}
