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
  location: string
  plannedStartTime: string
  plannedEndTime: string
  description: string
}

const emptyForm: FormState = {
  name: '',
  location: '',
  plannedStartTime: '',
  plannedEndTime: '',
  description: '',
}

function toIso(localDateTime: string): string | null {
  return localDateTime ? new Date(localDateTime).toISOString() : null
}

export function IncidentCreate() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'INCIDENT_CREATE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!canCreate) {
      navigate('/incidents', { replace: true })
    }
  }, [canCreate, navigate])

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/incidents', {
        name: form.name,
        location: form.location || null,
        plannedStartTime: toIso(form.plannedStartTime),
        plannedEndTime: toIso(form.plannedEndTime),
        description: form.description || null,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident created')
      navigate(`/incidents/${response.data.id}`)
    },
    onError: () => toast.error('Failed to create incident'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  if (!canCreate) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Incident</h1>
        <p className="text-muted-foreground text-sm">Set up a new planned or ongoing incident.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Passaic County Fair"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plannedStartTime">Planned Start</Label>
            <Input
              id="plannedStartTime"
              type="datetime-local"
              value={form.plannedStartTime}
              onChange={(e) => setForm({ ...form, plannedStartTime: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plannedEndTime">Planned End</Label>
            <Input
              id="plannedEndTime"
              type="datetime-local"
              value={form.plannedEndTime}
              onChange={(e) => setForm({ ...form, plannedEndTime: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <Button type="submit" disabled={createMutation.isPending}>
            Create Incident
          </Button>
        </div>
      </form>
    </div>
  )
}
