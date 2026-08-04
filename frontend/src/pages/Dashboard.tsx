import { useQuery } from '@tanstack/react-query'
import { Users, Siren, Boxes, Activity, CalendarClock } from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident, OperatorCheckIn, Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function useList<T>(key: string, url: string) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => (await api.get<T[]>(url)).data,
  })
}

export function Dashboard() {
  const incidents = useList<Incident>('incidents', '/api/incidents')
  const resources = useList<Resource>('resources', '/api/resources')
  const activeOperatorCheckIns = useList<OperatorCheckIn>(
    'operator-checkins-active',
    '/api/operator-checkins/active',
  )

  const plannedIncidents = incidents.data?.filter((i) => i.status === 'PLANNED').length ?? 0
  const activeIncidents = incidents.data?.filter((i) => i.status === 'ACTIVE').length ?? 0
  const assignedResources = resources.data?.filter((r) => r.status === 'ASSIGNED').length ?? 0

  const stats = [
    { label: 'Planned Incidents', value: plannedIncidents, icon: CalendarClock },
    { label: 'Active Incidents', value: activeIncidents, icon: Siren },
    { label: 'Operators Checked In', value: activeOperatorCheckIns.data?.length ?? 0, icon: Users },
    { label: 'Resources Deployed', value: assignedResources, icon: Boxes },
    { label: 'Total Resources', value: resources.data?.length ?? 0, icon: Activity },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Situational overview for NJ2PC-OEM.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
