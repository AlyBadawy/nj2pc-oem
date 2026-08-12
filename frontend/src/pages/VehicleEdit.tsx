import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Vehicle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type FormState = {
  year: string
  make: string
  model: string
  color: string
  licensePlateNumber: string
  licensePlateState: string
  notes: string
}

const emptyForm: FormState = {
  year: '',
  make: '',
  model: '',
  color: '',
  licensePlateNumber: '',
  licensePlateState: '',
  notes: '',
}

export function VehicleEdit() {
  const { user } = useAuth()
  const canManageAll = hasPermission(user, 'RESOURCE_MANAGE_ALL')
  const { operatorId, id } = useParams<{ operatorId: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loaded, setLoaded] = useState(false)
  const [canEditThis, setCanEditThis] = useState(true)

  useQuery({
    queryKey: ['vehicles', operatorId, id],
    queryFn: async () => {
      const { data } = await api.get<Vehicle[]>(`/api/operators/${operatorId}/vehicles`)
      const vehicle = data.find((v) => String(v.id) === id)
      if (vehicle) {
        setCanEditThis(canManageAll || vehicle.operatorCallsign === user?.callsign)
        setForm({
          year: String(vehicle.year),
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color ?? '',
          licensePlateNumber: vehicle.licensePlateNumber,
          licensePlateState: vehicle.licensePlateState,
          notes: vehicle.notes ?? '',
        })
      }
      setLoaded(true)
      return vehicle
    },
    enabled: !!operatorId && !!id,
  })

  useEffect(() => {
    if (loaded && !canEditThis) {
      navigate('/vehicles', { replace: true })
    }
  }, [loaded, canEditThis, navigate])

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/operators/${operatorId}/vehicles/${id}`, {
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
      toast.success('Vehicle updated')
      navigate('/vehicles')
    },
    onError: () => toast.error('Failed to update vehicle'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (!loaded || !canEditThis) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Vehicle</h1>
        <p className="text-muted-foreground text-sm">
          {form.make} {form.model}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Input
              id="licensePlateState"
              value={form.licensePlateState}
              onChange={(e) => setForm({ ...form, licensePlateState: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
