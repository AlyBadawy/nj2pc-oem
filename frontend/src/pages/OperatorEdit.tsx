import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { emptyOperatorForm, type OperatorFormState } from '@/lib/operatorForm'
import type { Operator } from '@/lib/types'
import { OperatorFormFields } from '@/components/OperatorFormFields'
import { Button } from '@/components/ui/button'

export function OperatorEdit() {
  const { user } = useAuth()
  const isAdmin = user?.accessLevel === 'ADMIN'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<OperatorFormState>(emptyOperatorForm)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      navigate(`/operators/${id}`, { replace: true })
    }
  }, [isAdmin, navigate, id])

  useQuery({
    queryKey: ['operators', id],
    queryFn: async () => {
      const { data } = await api.get<Operator>(`/api/operators/${id}`)
      setForm({
        callsign: data.callsign,
        name: data.name,
        licenseClass: data.licenseClass ?? '',
        dmrIds: data.dmrIds,
        phone: data.phone ?? '',
        email: data.email ?? '',
        status: data.status,
        notes: data.notes ?? '',
        addressLine1: data.addressLine1 ?? '',
        addressLine2: data.addressLine2 ?? '',
        addressAttn: data.addressAttn ?? '',
        latitude: data.latitude ?? '',
        longitude: data.longitude ?? '',
        gridSquare: data.gridSquare ?? '',
        accessLevel: data.accessLevel,
        password: '',
      })
      setLoaded(true)
      return data
    },
    enabled: isAdmin && !!id,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        dmrIds: form.dmrIds.map((d) => d.trim()).filter(Boolean),
        password: form.password.trim() ? form.password : null,
      }
      return api.put(`/api/operators/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator updated')
      navigate(`/operators/${id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update operator'
      toast.error(message)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (!isAdmin || !loaded) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Operator</h1>
        <p className="text-muted-foreground text-sm">{form.callsign}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <OperatorFormFields form={form} setForm={setForm} mode="edit" />
        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
