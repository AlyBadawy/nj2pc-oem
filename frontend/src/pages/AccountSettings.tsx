import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const permissionLabels: Record<string, string> = {
  OPERATOR_LIST: 'List Operators',
  OPERATOR_MANAGE_PERMISSIONS: 'Manage Permissions',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  )
}

export function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<Operator>('/api/auth/me')).data,
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update password'
      toast.error(message)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.')
      return
    }
    changePasswordMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground text-sm">Your operator profile and login credentials.</p>
      </div>

      {me && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Callsign" value={me.callsign} />
              <Field label="Name" value={me.name} />
              <div>
                <div className="text-xs text-muted-foreground">Permissions</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {me.admin && <Badge>Admin</Badge>}
                  {me.permissions.map((p) => (
                    <Badge key={p} variant="secondary">
                      {permissionLabels[p] ?? p}
                    </Badge>
                  ))}
                  {!me.admin && me.permissions.length === 0 && (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <Field label="License Class" value={me.licenseClass ?? ''} />
              <Field label="DMR IDs" value={me.dmrIds.join(', ')} />
              <Field label="Phone" value={me.phone ?? ''} />
              <Field label="Email" value={me.email ?? ''} />
              <Field label="Status" value={me.status} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={changePasswordMutation.isPending} className="self-start">
              <KeyRound className="size-4" />
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
