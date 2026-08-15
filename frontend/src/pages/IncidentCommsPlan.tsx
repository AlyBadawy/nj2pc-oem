import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { CommunicationPlan, Incident, IncidentCommsPlanApplication } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function IncidentCommsPlan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyId, setApplyId] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const { data: incident } = useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  })

  const { data: activeCommsPlan } = useQuery({
    queryKey: ['incidents', id, 'comms-plan-active'],
    queryFn: async () => {
      const res = await api.get<IncidentCommsPlanApplication | null>(`/api/incidents/${id}/comms-plan-applications/active`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      return res.status === 204 ? null : res.data
    },
  })

  const { data: commsPlanHistory } = useQuery({
    queryKey: ['incidents', id, 'comms-plan-history'],
    queryFn: async () => (await api.get<IncidentCommsPlanApplication[]>(`/api/incidents/${id}/comms-plan-applications`)).data,
  })

  const { data: availableCommsPlans } = useQuery({
    queryKey: ['comms-plans', 'active'],
    queryFn: async () => (await api.get<CommunicationPlan[]>('/api/comms-plans', { params: { active: true } })).data,
  })

  const applyMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/comms-plan-applications`, { communicationPlanId: Number(applyId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-active'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-history'] })
      toast.success('Communications plan applied')
      setApplyOpen(false)
      setApplyId('')
    },
    onError: () => toast.error('Failed to apply communications plan'),
  })

  const revokeMutation = useMutation({
    mutationFn: async (applicationId: number) => api.post(`/api/incidents/${id}/comms-plan-applications/${applicationId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-active'] })
      queryClient.invalidateQueries({ queryKey: ['incidents', id, 'comms-plan-history'] })
      toast.success('Communications plan revoked')
    },
    onError: () => toast.error('Failed to revoke communications plan'),
  })

  async function handleDownloadPdf() {
    if (!activeCommsPlan) return
    setDownloadingPdf(true)
    try {
      const response = await api.get(`/api/comms-plans/${activeCommsPlan.communicationPlanId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `ICS-205-${activeCommsPlan.planName.replace(/[^a-zA-Z0-9-]+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!incident) return null

  const canEdit = incident.canEdit

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)} className="mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to {incident.name}
        </Button>
        <h1 className="text-2xl font-semibold">Communications Plan</h1>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Current Plan</p>
            <div className="flex flex-wrap items-center gap-2">
              {activeCommsPlan && (
                <Button size="sm" variant="outline" disabled={downloadingPdf} onClick={handleDownloadPdf}>
                  {downloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Generate PDF
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!canEdit}
                title={canEdit ? 'Apply or change the communications plan' : 'Requires edit access to this incident'}
                onClick={() => setApplyOpen(true)}
              >
                {activeCommsPlan ? 'Change Plan' : 'Apply Plan'}
              </Button>
            </div>
          </div>

          {activeCommsPlan ? (
            <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/comms-plans/${activeCommsPlan.communicationPlanId}`} className="font-medium hover:underline">
                    {activeCommsPlan.planName}
                  </Link>
                  <Badge variant="secondary">v{activeCommsPlan.planVersion}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Applied {new Date(activeCommsPlan.appliedAt).toLocaleString()} by {activeCommsPlan.appliedByCallsign ?? 'System'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canEdit}
                title={canEdit ? 'Revoke this communications plan' : 'Requires edit access to this incident'}
                onClick={() => revokeMutation.mutate(activeCommsPlan.id)}
              >
                Revoke
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No communications plan applied.</p>
          )}

          {commsPlanHistory && commsPlanHistory.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">History</p>
              <ul className="flex flex-col gap-1">
                {commsPlanHistory.map((h) => (
                  <li key={h.id}>
                    <Link
                      to={`/comms-plans/${h.communicationPlanId}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{h.planName}</span>
                      <Badge variant="outline">v{h.planVersion}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Communications Plan</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              applyMutation.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="applyCommsPlanId">Plan</Label>
              <Select value={applyId} onValueChange={setApplyId}>
                <SelectTrigger id="applyCommsPlanId">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {availableCommsPlans?.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} (v{plan.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!applyId || applyMutation.isPending}>
                Apply
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
