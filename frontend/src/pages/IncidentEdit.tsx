import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Incident } from '@/lib/types'
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

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function IncidentEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loaded, setLoaded] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      const { data } = await api.get<Incident>(`/api/incidents/${id}`)
      setForm({
        name: data.name,
        location: data.location ?? '',
        plannedStartTime: toLocalInput(data.plannedStartTime),
        plannedEndTime: toLocalInput(data.plannedEndTime),
        description: data.description ?? '',
      })
      setCanEdit(data.canEdit)
      setLoaded(true)
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (loaded && (!canEdit || incident?.status === 'CLOSED')) {
      navigate(`/incidents/${id}`, { replace: true })
    }
  }, [loaded, canEdit, incident, navigate, id])

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/incidents/${id}`, {
        name: form.name,
        location: form.location || null,
        plannedStartTime: toIso(form.plannedStartTime),
        plannedEndTime: toIso(form.plannedEndTime),
        description: form.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id] })
      toast.success('Incident updated')
      navigate(`/incidents/${id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update incident'
      toast.error(message)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (!loaded || !canEdit || incident?.status === 'CLOSED') return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Incident</h1>
        <p className="text-muted-foreground text-sm">{form.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
