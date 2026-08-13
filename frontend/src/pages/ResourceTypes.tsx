import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { ResourceFieldType, ResourceType, ResourceTypeField } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const fieldTypeLabels: Record<ResourceFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  BOOLEAN: 'Yes / No',
  DATE: 'Date',
  SELECT: 'Dropdown',
}

type NewFieldState = {
  name: string
  fieldType: ResourceFieldType
  required: boolean
  optionsText: string
}

const emptyNewField: NewFieldState = { name: '', fieldType: 'TEXT', required: false, optionsText: '' }

type EditFieldState = {
  fieldType: ResourceFieldType
  required: boolean
  optionsText: string
}

export function ResourceTypes() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'RESOURCE_TYPE_MANAGE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [newField, setNewField] = useState<NewFieldState>(emptyNewField)
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [editField, setEditField] = useState<EditFieldState>({ fieldType: 'TEXT', required: false, optionsText: '' })

  useEffect(() => {
    if (!canManage) {
      navigate('/settings', { replace: true })
    }
  }, [canManage, navigate])

  const { data: resourceTypes, isLoading } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
    enabled: canManage,
  })

  const createMutation = useMutation({
    mutationFn: async () => api.post('/api/resource-types', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Equipment type added')
      setName('')
    },
    onError: () => toast.error('Failed to add equipment type'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      api.put(`/api/resource-types/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Equipment type updated')
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update equipment type'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/resource-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Equipment type removed')
    },
    onError: () => toast.error('Failed to remove equipment type'),
  })

  const addFieldMutation = useMutation({
    mutationFn: async ({ typeId, field }: { typeId: number; field: NewFieldState }) =>
      api.post(`/api/resource-types/${typeId}/fields`, {
        name: field.name,
        fieldType: field.fieldType,
        required: field.required,
        options:
          field.fieldType === 'SELECT'
            ? field.optionsText
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Field added')
      setNewField(emptyNewField)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add field'
      toast.error(message)
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: async ({
      typeId,
      fieldId,
      name,
      field,
    }: {
      typeId: number
      fieldId: number
      name: string
      field: EditFieldState
    }) =>
      api.put(`/api/resource-types/${typeId}/fields/${fieldId}`, {
        name,
        fieldType: field.fieldType,
        required: field.required,
        options:
          field.fieldType === 'SELECT'
            ? field.optionsText
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Field updated')
      setEditingFieldId(null)
    },
    onError: () => toast.error('Failed to update field'),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: async ({ typeId, fieldId }: { typeId: number; fieldId: number }) =>
      api.delete(`/api/resource-types/${typeId}/fields/${fieldId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] })
      toast.success('Field removed')
    },
    onError: () => toast.error('Failed to remove field'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  function startEdit(type: ResourceType) {
    setEditingId(type.id)
    setEditName(type.name)
  }

  function toggleExpanded(typeId: number) {
    setExpandedId(expandedId === typeId ? null : typeId)
    setNewField(emptyNewField)
    setEditingFieldId(null)
  }

  function startEditField(field: ResourceTypeField) {
    setEditingFieldId(field.id)
    setEditField({
      fieldType: field.fieldType,
      required: field.required,
      optionsText: field.options?.join(', ') ?? '',
    })
  }

  if (!canManage) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Equipment Types</h1>
        <p className="text-muted-foreground text-sm">
          Categories available when adding gear or equipment. Expand a type to manage its custom
          fields.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Equipment Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {resourceTypes?.map((type) => (
                <Fragment key={type.id}>
                  <TableRow>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleExpanded(type.id)}>
                        {expandedId === type.id ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {editingId === type.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 max-w-xs"
                          autoFocus
                        />
                      ) : (
                        type.name
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {editingId === type.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!editName.trim() || updateMutation.isPending}
                            onClick={() => updateMutation.mutate({ id: type.id, name: editName })}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon-sm" onClick={() => startEdit(type)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteMutation.mutate(type.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === type.id && (
                    <TableRow>
                      <TableCell />
                      <TableCell colSpan={2} className="bg-muted/30">
                        <div className="flex flex-col gap-3 py-2">
                          {type.fields.length === 0 && (
                            <p className="text-sm text-muted-foreground">No custom fields yet.</p>
                          )}
                          {type.fields.length > 0 && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Required</TableHead>
                                  <TableHead>Options</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {type.fields.map((field) => (
                                  <TableRow key={field.id}>
                                    <TableCell className="font-medium">{field.name}</TableCell>
                                    <TableCell>
                                      {editingFieldId === field.id ? (
                                        <Select
                                          value={editField.fieldType}
                                          onValueChange={(value: ResourceFieldType) =>
                                            setEditField({ ...editField, fieldType: value })
                                          }
                                        >
                                          <SelectTrigger className="h-8 w-32">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(fieldTypeLabels).map(([value, label]) => (
                                              <SelectItem key={value} value={value}>
                                                {label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        fieldTypeLabels[field.fieldType]
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {editingFieldId === field.id ? (
                                        <input
                                          type="checkbox"
                                          checked={editField.required}
                                          onChange={(e) =>
                                            setEditField({ ...editField, required: e.target.checked })
                                          }
                                        />
                                      ) : field.required ? (
                                        <Badge variant="secondary">Required</Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">Optional</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {editingFieldId === field.id ? (
                                        editField.fieldType === 'SELECT' && (
                                          <Input
                                            className="h-8"
                                            value={editField.optionsText}
                                            onChange={(e) =>
                                              setEditField({ ...editField, optionsText: e.target.value })
                                            }
                                            placeholder="Option A, Option B"
                                          />
                                        )
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          {field.options?.join(', ') ?? '—'}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                      {editingFieldId === field.id ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={updateFieldMutation.isPending}
                                            onClick={() =>
                                              updateFieldMutation.mutate({
                                                typeId: type.id,
                                                fieldId: field.id,
                                                name: field.name,
                                                field: editField,
                                              })
                                            }
                                          >
                                            <Check className="size-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setEditingFieldId(null)}
                                          >
                                            <X className="size-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => startEditField(field)}
                                          >
                                            <Pencil className="size-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                              deleteFieldMutation.mutate({ typeId: type.id, fieldId: field.id })
                                            }
                                          >
                                            <Trash2 className="size-4" />
                                          </Button>
                                        </>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}

                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              addFieldMutation.mutate({ typeId: type.id, field: newField })
                            }}
                            className="flex flex-wrap items-end gap-2 pt-2"
                          >
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs">Field name</Label>
                              <Input
                                className="h-8 w-40"
                                value={newField.name}
                                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                placeholder="Frequency Range"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={newField.fieldType}
                                onValueChange={(value: ResourceFieldType) =>
                                  setNewField({ ...newField, fieldType: value })
                                }
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {newField.fieldType === 'SELECT' && (
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Options</Label>
                                <Input
                                  className="h-8 w-48"
                                  value={newField.optionsText}
                                  onChange={(e) => setNewField({ ...newField, optionsText: e.target.value })}
                                  placeholder="Option A, Option B"
                                />
                              </div>
                            )}
                            <label className="flex items-center gap-1.5 text-sm pb-1.5">
                              <input
                                type="checkbox"
                                checked={newField.required}
                                onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                              />
                              Required
                            </label>
                            <Button type="submit" size="sm" disabled={addFieldMutation.isPending}>
                              <Plus className="size-4" />
                              Add Field
                            </Button>
                          </form>
                          <p className="text-xs text-muted-foreground">
                            Field names can't be renamed after creation — delete and re-add instead,
                            since renaming would orphan existing equipment's saved values.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Equipment Type</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resourceTypeName">New equipment type</Label>
              <Input
                id="resourceTypeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Radio"
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="size-4" />
              Add Equipment Type
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
