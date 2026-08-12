import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { hasPermission, useAuth } from '@/lib/auth-context'
import type { AuditEntityType, AuditLogEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const entityTypes: AuditEntityType[] = ['OPERATOR', 'INCIDENT', 'RESOURCE', 'RESOURCE_TYPE', 'VEHICLE']

export function AuditLog() {
  const { user } = useAuth()
  const canView = hasPermission(user, 'LOG_VIEW')
  const navigate = useNavigate()
  const [entityTypeInput, setEntityTypeInput] = useState<string>('')
  const [entityIdInput, setEntityIdInput] = useState('')
  const [filter, setFilter] = useState<{ entityType?: AuditEntityType; entityId?: number }>({})

  useEffect(() => {
    if (!canView) {
      navigate('/', { replace: true })
    }
  }, [canView, navigate])

  const { data: entries, isLoading } = useQuery({
    queryKey: ['audit-log', filter],
    queryFn: async () =>
      (
        await api.get<AuditLogEntry[]>('/api/audit-log', {
          params: filter,
        })
      ).data,
    enabled: canView,
  })

  function applyFilter() {
    const entityId = entityIdInput.trim() ? Number(entityIdInput.trim()) : undefined
    const entityType = entityTypeInput ? (entityTypeInput as AuditEntityType) : undefined
    setFilter(entityType && entityId ? { entityType, entityId } : {})
  }

  function clearFilter() {
    setEntityTypeInput('')
    setEntityIdInput('')
    setFilter({})
  }

  if (!canView) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          Record of permission-sensitive changes across the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={entityTypeInput} onValueChange={setEntityTypeInput}>
                <SelectTrigger id="entityType" className="w-[180px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityId">Entity ID</Label>
              <Input
                id="entityId"
                className="w-[120px]"
                value={entityIdInput}
                onChange={(e) => setEntityIdInput(e.target.value)}
                placeholder="e.g. 5"
                inputMode="numeric"
              />
            </div>
            <Button
              variant="outline"
              disabled={!entityTypeInput || !entityIdInput.trim()}
              onClick={applyFilter}
            >
              <Search className="size-4" />
              Apply
            </Button>
            <Button variant="ghost" onClick={clearFilter}>
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter.entityType ? `${filter.entityType.replace('_', ' ')} #${filter.entityId}` : 'Global Feed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && entries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No log entries.
                  </TableCell>
                </TableRow>
              )}
              {entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(entry.performedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <Badge variant="secondary">
                      {entry.entityType.replace('_', ' ')} #{entry.entityId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{entry.action}</TableCell>
                  <TableCell className="text-sm max-w-[400px]">{entry.summary}</TableCell>
                  <TableCell className="text-sm">{entry.performedByCallsign ?? '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{entry.performedIp ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
