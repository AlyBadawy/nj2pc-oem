import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Operator, ResourceType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FormState = {
  resourceTypeId: string
  identifier: string
  serialNumber: string
  ownerId: string
  notes: string
}

const emptyForm: FormState = {
  resourceTypeId: '',
  identifier: '',
  serialNumber: '',
  ownerId: '',
  notes: '',
}

const NONE = '__none__'

export function ResourceCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/resources', {
        resourceTypeId: Number(form.resourceTypeId),
        identifier: form.identifier,
        serialNumber: form.serialNumber || null,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource created')
      navigate('/resources')
    },
    onError: () => toast.error('Failed to create resource'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Resource</h1>
        <p className="text-muted-foreground text-sm">Register a radio, repeater, or piece of equipment.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resourceTypeId">Resource Type</Label>
            <Select
              value={form.resourceTypeId}
              onValueChange={(value) => setForm({ ...form, resourceTypeId: value })}
            >
              <SelectTrigger id="resourceTypeId">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">Identifier</Label>
            <Input
              id="identifier"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ownerId">Owner</Label>
            <Select
              value={form.ownerId || NONE}
              onValueChange={(value) => setForm({ ...form, ownerId: value === NONE ? '' : value })}
            >
              <SelectTrigger id="ownerId">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
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
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div>
          <Button type="submit" disabled={createMutation.isPending || !form.resourceTypeId}>
            Add Resource
          </Button>
        </div>
      </form>
    </div>
  )
}
