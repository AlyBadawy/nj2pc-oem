import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function Operators() {
  const { user } = useAuth()
  const isAdmin = user?.accessLevel === 'ADMIN'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await api.get<Operator[]>('/api/operators')).data,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator removed')
    },
    onError: () => toast.error('Failed to delete operator'),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Operators</h1>
        <p className="text-muted-foreground text-sm">Registered operator roster.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Callsign</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>License</TableHead>
                <TableHead>DMR ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {operators?.map((op) => (
                <TableRow
                  key={op.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/operators/${op.id}`)}
                >
                  <TableCell className="font-medium">{op.callsign}</TableCell>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op.licenseClass || '—'}</TableCell>
                  <TableCell>{op.dmrIds.length > 0 ? op.dmrIds.join(', ') : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {op.phone || op.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {op.hasLoginAccess ? (
                      <Badge variant={op.accessLevel === 'ADMIN' ? 'default' : 'secondary'}>
                        {op.accessLevel}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No login</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/operators/${op.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(op.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
