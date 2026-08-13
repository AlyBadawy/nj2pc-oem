import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type FormState = {
  name: string
  preparedByName: string
  preparedByCallsign: string
  specialInstructions: string
}

const emptyForm: FormState = {
  name: '',
  preparedByName: '',
  preparedByCallsign: '',
  specialInstructions: '',
}

export function CommsPlanCreate() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'COMMS_PLAN_MANAGE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!canManage) {
      navigate('/comms-plans', { replace: true })
    }
  }, [canManage, navigate])

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/comms-plans', {
        name: form.name,
        preparedByName: form.preparedByName || null,
        preparedByCallsign: form.preparedByCallsign || null,
        preparedAt: form.preparedByName ? new Date().toISOString() : null,
        specialInstructions: form.specialInstructions || null,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans'] })
      toast.success('Communications plan created')
      navigate(`/comms-plans/${response.data.id}`)
    },
    onError: () => toast.error('Failed to create communications plan'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  if (!canManage) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New Communications Plan</h1>
        <p className="text-muted-foreground text-sm">Set up a new ICS-205 radio channel plan.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Passaic County Fair 2026"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preparedByName">Prepared By</Label>
            <Input
              id="preparedByName"
              value={form.preparedByName}
              onChange={(e) => setForm({ ...form, preparedByName: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preparedByCallsign">Callsign</Label>
            <Input
              id="preparedByCallsign"
              value={form.preparedByCallsign}
              onChange={(e) => setForm({ ...form, preparedByCallsign: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="specialInstructions">Special Instructions</Label>
          <Textarea
            id="specialInstructions"
            value={form.specialInstructions}
            onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
          />
        </div>
        <div>
          <Button type="submit" disabled={createMutation.isPending}>
            Create Plan
          </Button>
        </div>
      </form>
    </div>
  )
}
