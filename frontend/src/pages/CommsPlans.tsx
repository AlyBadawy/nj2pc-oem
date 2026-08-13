import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Radio as RadioIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { CommunicationPlan } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function CommsPlans() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'COMMS_PLAN_MANAGE')
  const navigate = useNavigate()

  const { data: plans, isLoading } = useQuery({
    queryKey: ['comms-plans'],
    queryFn: async () =>
      (await api.get<CommunicationPlan[]>('/api/comms-plans', { params: { active: true } })).data,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Communications Plans</h1>
          <p className="text-muted-foreground text-sm">ICS-205 radio channel plans.</p>
        </div>
        <Button
          disabled={!canManage}
          title={canManage ? 'Create communications plan' : 'Requires Manage Comms Plans permission'}
          onClick={() => navigate('/comms-plans/new')}
        >
          <Plus className="size-4" />
          New Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {plans?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No communications plans yet.
                  </TableCell>
                </TableRow>
              )}
              {plans?.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/comms-plans/${plan.id}`)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    <RadioIcon className="size-4 text-muted-foreground" />
                    {plan.name}
                    <Badge variant="outline">v{plan.version}</Badge>
                  </TableCell>
                  <TableCell>
                    {plan.preparedByCallsign
                      ? `${plan.preparedByCallsign}${plan.preparedByName ? ` (${plan.preparedByName})` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {plan.incidents.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {plan.incidents.map((incident) => (
                          <Badge key={incident.id} variant="secondary">
                            {incident.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
