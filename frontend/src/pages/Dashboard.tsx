import { useQuery } from '@tanstack/react-query'
import { Users, Siren, Boxes, Activity } from 'lucide-react'
import { api } from '@/lib/api'
import type { Operator, Incident, Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function useList<T>(key: string, url: string) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => (await api.get<T[]>(url)).data,
  })
}

export function Dashboard() {
  const operators = useList<Operator>('operators', '/api/operators')
  const incidents = useList<Incident>('incidents', '/api/incidents')
  const resources = useList<Resource>('resources', '/api/resources')

  const activeIncidents = incidents.data?.filter((i) => i.status === 'ACTIVE').length ?? 0
  const activeOperators = operators.data?.filter((o) => o.status === 'ACTIVE').length ?? 0
  const assignedResources = resources.data?.filter((r) => r.status === 'ASSIGNED').length ?? 0

  const stats = [
    { label: 'Active Incidents', value: activeIncidents, icon: Siren },
    { label: 'Active Operators', value: activeOperators, icon: Users },
    { label: 'Resources Deployed', value: assignedResources, icon: Boxes },
    { label: 'Total Resources', value: resources.data?.length ?? 0, icon: Activity },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Situational overview for NJ2PC-OEM.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
