import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { emptyOperatorForm, type OperatorFormState } from '@/lib/operatorForm'
import { formatCallookLicenseClass, formatCallookName, lookupCallsign } from '@/lib/callook'
import { OperatorFormFields } from '@/components/OperatorFormFields'
import { Button } from '@/components/ui/button'

export function OperatorCreate() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'OPERATOR_CREATE')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<OperatorFormState>(emptyOperatorForm)
  const [lookupLoading, setLookupLoading] = useState(false)

  useEffect(() => {
    if (!canCreate) {
      navigate('/', { replace: true })
    }
  }, [canCreate, navigate])

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        dmrIds: form.dmrIds.map((d) => d.trim()).filter(Boolean),
      }
      return api.post('/api/operators', payload)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator registered')
      navigate(`/operators/${response.data.id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to register operator'
      toast.error(message)
    },
  })

  async function handleCallsignBlur() {
    if (!form.callsign.trim()) return
    setLookupLoading(true)
    const result = await lookupCallsign(form.callsign)
    setLookupLoading(false)

    if (!result || result.status !== 'VALID' || result.type !== 'PERSON') {
      if (result) {
        toast.info('Callsign not found in FCC database — enter details manually.')
      }
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
    createMutation.mutate()
  }

  if (!canCreate) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Register Operator</h1>
        <p className="text-muted-foreground text-sm">Add a new operator to the roster.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <OperatorFormFields
          form={form}
          setForm={setForm}
          mode="create"
          lookupLoading={lookupLoading}
          onCallsignBlur={handleCallsignBlur}
        />
        <div>
          <Button type="submit" disabled={createMutation.isPending}>
            Register Operator
          </Button>
        </div>
      </form>
    </div>
  )
}
