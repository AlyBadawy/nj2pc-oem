import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Operator, Resource, ResourceType } from '@/lib/types'
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
import { CustomFieldInputs, type CustomFieldValues } from '@/components/CustomFieldInputs'

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

export function ResourceEdit() {
  const { user } = useAuth()
  const canManageAll = hasPermission(user, 'RESOURCE_MANAGE_ALL')
  const canAssignOwner = canManageAll || hasPermission(user, 'RESOURCE_ASSIGN_OWNER')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})
  const [loaded, setLoaded] = useState(false)
  const [canEditThis, setCanEditThis] = useState(true)

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
  })

  const selectedType = resourceTypes?.find((t) => String(t.id) === form.resourceTypeId)

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
    enabled: canAssignOwner,
  })

  useQuery({
    queryKey: ['resources', id],
    queryFn: async () => {
      const { data } = await api.get<Resource>(`/api/resources/${id}`)
      setCanEditThis(canManageAll || data.ownerCallsign === user?.callsign)
      setForm({
        resourceTypeId: String(data.resourceTypeId),
        identifier: data.identifier,
        serialNumber: data.serialNumber ?? '',
        ownerId: data.ownerId ? String(data.ownerId) : '',
        notes: data.notes ?? '',
      })
      setCustomFields(data.customFields as CustomFieldValues)
      setLoaded(true)
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (loaded && !canEditThis) {
      navigate('/resources', { replace: true })
    }
  }, [loaded, canEditThis, navigate])

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put(`/api/resources/${id}`, {
        resourceTypeId: Number(form.resourceTypeId),
        identifier: form.identifier,
        serialNumber: form.serialNumber || null,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        notes: form.notes || null,
        customFields,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Equipment updated')
      navigate('/resources')
    },
    onError: () => toast.error('Failed to update equipment'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (!loaded || !canEditThis) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Equipment</h1>
        <p className="text-muted-foreground text-sm">{form.identifier}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resourceTypeId">Equipment Type</Label>
            <Select
              value={form.resourceTypeId}
              onValueChange={(value) => {
                setForm({ ...form, resourceTypeId: value })
                setCustomFields({})
              }}
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
          {canAssignOwner && (
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
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {selectedType && (
          <CustomFieldInputs fields={selectedType.fields} values={customFields} onChange={setCustomFields} />
        )}

        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
