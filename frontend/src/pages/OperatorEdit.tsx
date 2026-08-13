import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { emptyOperatorForm, type OperatorFormState } from '@/lib/operatorForm'
import { formatCallookLicenseClass, formatCallookName, lookupCallsign } from '@/lib/callook'
import type { Operator } from '@/lib/types'
import { OperatorFormFields } from '@/components/OperatorFormFields'
import { Button } from '@/components/ui/button'

export function OperatorEdit() {
  const { user } = useAuth()
  const isAdmin = user?.admin ?? false
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<OperatorFormState>(emptyOperatorForm)
  const [loaded, setLoaded] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)

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
        password: '',
        permissions: data.permissions,
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

  async function handleLookup() {
    if (!form.callsign.trim()) return
    setLookupLoading(true)
    const result = await lookupCallsign(form.callsign)
    setLookupLoading(false)

    if (!result || result.status !== 'VALID' || result.type !== 'PERSON') {
      toast.info('Callsign not found in FCC database.')
      return
    }

    setForm((f) => ({
      ...f,
      name: result.name ? formatCallookName(result.name) : f.name,
      licenseClass: result.current?.operClass
        ? formatCallookLicenseClass(result.current.operClass)
        : f.licenseClass,
      addressLine1: result.address?.line1 || f.addressLine1,
      addressLine2: result.address?.line2 || f.addressLine2,
      addressAttn: result.address?.attn || f.addressAttn,
      latitude: result.location?.latitude || f.latitude,
      longitude: result.location?.longitude || f.longitude,
      gridSquare: result.location?.gridsquare || f.gridSquare,
    }))
    toast.success('Auto-filled from FCC database — review before saving.')
  }

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
        <OperatorFormFields
          form={form}
          setForm={setForm}
          mode="edit"
          lookupLoading={lookupLoading}
          onLookupClick={handleLookup}
        />
        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
