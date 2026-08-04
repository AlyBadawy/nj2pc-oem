import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Radio as RadioIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { CommunicationPlan } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type FormState = {
  name: string
  preparedByName: string
  preparedByCallsign: string
  specialInstructions: string
}

const emptyForm: FormState = {
  name: '',
  preparedByName: '',
  preparedByCallsign: '',
  specialInstructions: '',
}

export function CommsPlans() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['comms-plans'],
    queryFn: async () => (await api.get<CommunicationPlan[]>('/api/comms-plans')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/comms-plans', {
        name: form.name,
        preparedByName: form.preparedByName || null,
        preparedByCallsign: form.preparedByCallsign || null,
        preparedAt: form.preparedByName ? new Date().toISOString() : null,
        specialInstructions: form.specialInstructions || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-plans'] })
      toast.success('Communications plan created')
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: () => toast.error('Failed to create communications plan'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Communications Plans</h1>
          <p className="text-muted-foreground text-sm">ICS-205 radio channel plans.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
              {plans?.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/comms-plans/${plan.id}`)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    <RadioIcon className="size-4 text-muted-foreground" />
                    {plan.name}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Communications Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Passaic County Fair 2026"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="preparedByName">Prepared By</Label>
                <Input
                  id="preparedByName"
                  value={form.preparedByName}
                  onChange={(e) => setForm({ ...form, preparedByName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="preparedByCallsign">Callsign</Label>
                <Input
                  id="preparedByCallsign"
                  value={form.preparedByCallsign}
                  onChange={(e) =>
                    setForm({ ...form, preparedByCallsign: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={form.specialInstructions}
                onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
