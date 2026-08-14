import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { Resource, ResourceType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}

export function ResourceView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManageAll = hasPermission(user, 'RESOURCE_MANAGE_ALL')

  const { data: resource } = useQuery({
    queryKey: ['resources', id],
    queryFn: async () => (await api.get<Resource>(`/api/resources/${id}`)).data,
  })

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => (await api.get<ResourceType[]>('/api/resource-types')).data,
  })

  const type = resourceTypes?.find((t) => t.id === resource?.resourceTypeId)
  const canEditThis = canManageAll || resource?.ownerCallsign === user?.callsign

  if (!resource) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{resource.identifier}</h1>
            <p className="text-muted-foreground text-sm">{resource.resourceTypeName}</p>
          </div>
          <Button
            variant="outline"
            disabled={!canEditThis}
            title={canEditThis ? 'Edit equipment' : "You don't own this equipment"}
            onClick={() => navigate(`/resources/${id}/edit`)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Type" value={resource.resourceTypeName} />
          <Field label="Identifier" value={resource.identifier} />
          <Field label="Serial Number" value={resource.serialNumber} />
          <Field
            label="Owner"
            value={
              resource.ownerId ? (
                <Link to={`/operators/${resource.ownerId}`} className="hover:underline">
                  {resource.ownerCallsign}
                </Link>
              ) : null
            }
          />
          <Field label="Notes" value={resource.notes} className="sm:col-span-3" />
        </CardContent>
      </Card>

      {type && type.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {type.fields.map((f) => {
              const raw = resource.customFields[f.name]
              const display =
                raw === undefined || raw === null || raw === '' ? null : f.fieldType === 'BOOLEAN' ? (raw ? 'Yes' : 'No') : String(raw)
              return <Field key={f.id} label={f.name} value={display} />
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
