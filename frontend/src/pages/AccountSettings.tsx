import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, KeyRound, Plus, Printer, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiUrl } from '@/lib/api'
import { permissionCatalog } from '@/lib/permissions'
import { credentialNoFor, incidentRef, type OperatorIdentityData } from '@/lib/identity'
import type { Operator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperatorIdentity } from '@/components/identity/OperatorIdentity'

type ProfileFormState = {
  name: string
  licenseClass: string
  dmrIds: string[]
  phone: string
  email: string
  notes: string
  addressLine1: string
  addressLine2: string
  addressAttn: string
  latitude: string
  longitude: string
  gridSquare: string
}

const emptyProfileForm: ProfileFormState = {
  name: '',
  licenseClass: '',
  dmrIds: [],
  phone: '',
  email: '',
  notes: '',
  addressLine1: '',
  addressLine2: '',
  addressAttn: '',
  latitude: '',
  longitude: '',
  gridSquare: '',
}

function profileFormFrom(o: Operator): ProfileFormState {
  return {
    name: o.name,
    licenseClass: o.licenseClass ?? '',
    dmrIds: o.dmrIds,
    phone: o.phone ?? '',
    email: o.email ?? '',
    notes: o.notes ?? '',
    addressLine1: o.addressLine1 ?? '',
    addressLine2: o.addressLine2 ?? '',
    addressAttn: o.addressAttn ?? '',
    latitude: o.latitude ?? '',
    longitude: o.longitude ?? '',
    gridSquare: o.gridSquare ?? '',
  }
}

export function AccountSettings() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<Operator>('/api/auth/me')).data,
  })

  useEffect(() => {
    if (me) setProfileForm(profileFormFrom(me))
  }, [me])

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!me) return
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/api/operators/${me.id}/photo`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Photo updated')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to upload photo'
      toast.error(message)
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async () => me && api.delete(`/api/operators/${me.id}/photo`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Photo removed')
    },
    onError: () => toast.error('Failed to remove photo'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => api.post('/api/auth/change-password', { currentPassword, newPassword }),
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

  const saveProfileMutation = useMutation({
    mutationFn: async () =>
      api.put('/api/auth/me', {
        ...profileForm,
        dmrIds: profileForm.dmrIds.map((d) => d.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Profile updated')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update profile'
      toast.error(message)
    },
  })

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    changePasswordMutation.mutate()
  }

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    saveProfileMutation.mutate()
  }

  const identity: OperatorIdentityData | null = me
    ? {
        id: me.id,
        callsign: me.callsign,
        name: me.name,
        licenseClass: me.licenseClass,
        role: me.currentCheckIn?.roleName ?? null,
        roleColor: me.currentCheckIn?.roleColor ?? null,
        roleAccessLevel: me.currentCheckIn?.roleAccessLevel ?? null,
        canViewContact: true,
        phone: me.phone,
        email: me.email,
        licensePlate: me.licensePlate,
        photoUrl: me.photoUrl ? apiUrl(me.photoUrl) : null,
        credentialNo: credentialNoFor(me.id),
        incident: me.currentCheckIn
          ? {
              id: me.currentCheckIn.incidentId,
              name: me.currentCheckIn.incidentName,
              ref: incidentRef(me.currentCheckIn.incidentId, me.currentCheckIn.checkedInAt),
            }
          : null,
        checkedInAt: me.currentCheckIn?.checkedInAt ?? null,
      }
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Your operator credential and login.</p>
        </div>
        {identity && (
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        )}
      </div>

      {identity && me && (
        <div
          id="credential-print-root"
          className="bg-credential-paper-edge p-6 rounded-lg print:p-0 print:bg-transparent"
        >
          <OperatorIdentity variant="credential" data={identity} />
          <div className="mt-3 flex items-center gap-2 print:hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPhotoMutation.mutate(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadPhotoMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {me.photoUrl ? 'Replace Photo' : 'Upload Photo'}
            </Button>
            {me.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                disabled={deletePhotoMutation.isPending}
                onClick={() => deletePhotoMutation.mutate()}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {me && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileName">Name</Label>
                  <Input
                    id="profileName"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileLicenseClass">License Class</Label>
                  <Input
                    id="profileLicenseClass"
                    value={profileForm.licenseClass}
                    onChange={(e) => setProfileForm({ ...profileForm, licenseClass: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profilePhone">Phone</Label>
                  <Input
                    id="profilePhone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profileEmail">Email</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  className="max-w-sm"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profileNotes">Notes</Label>
                <Textarea
                  id="profileNotes"
                  value={profileForm.notes}
                  onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium pt-4 pb-2">Address</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileAddressLine1">Street</Label>
                  <Input
                    id="profileAddressLine1"
                    value={profileForm.addressLine1}
                    onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileAddressLine2">City, State ZIP</Label>
                  <Input
                    id="profileAddressLine2"
                    value={profileForm.addressLine2}
                    onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileAddressAttn">Attn</Label>
                  <Input
                    id="profileAddressAttn"
                    value={profileForm.addressAttn}
                    onChange={(e) => setProfileForm({ ...profileForm, addressAttn: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium pt-4 pb-2">Location</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileLatitude">Latitude</Label>
                  <Input
                    id="profileLatitude"
                    value={profileForm.latitude}
                    onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })}
                    placeholder="40.8915158"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileLongitude">Longitude</Label>
                  <Input
                    id="profileLongitude"
                    value={profileForm.longitude}
                    onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })}
                    placeholder="-74.1959347"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileGridSquare">Grid Square</Label>
                  <Input
                    id="profileGridSquare"
                    value={profileForm.gridSquare}
                    onChange={(e) => setProfileForm({ ...profileForm, gridSquare: e.target.value })}
                    placeholder="FN20vv"
                  />
                </div>
              </div>

              <div>
                <Button type="submit" disabled={saveProfileMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {me && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">DMR IDs</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveProfileMutation.mutate()
              }}
              className="flex flex-col gap-3"
            >
              {profileForm.dmrIds.length === 0 && (
                <p className="text-sm text-muted-foreground">No DMR IDs added yet.</p>
              )}
              {profileForm.dmrIds.map((dmrId, index) => (
                <div key={index} className="flex items-center gap-2 max-w-sm">
                  <Input
                    value={dmrId}
                    onChange={(e) => {
                      const next = [...profileForm.dmrIds]
                      next[index] = e.target.value
                      setProfileForm({ ...profileForm, dmrIds: next })
                    }}
                    placeholder="3123456"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setProfileForm({
                        ...profileForm,
                        dmrIds: profileForm.dmrIds.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setProfileForm({ ...profileForm, dmrIds: [...profileForm.dmrIds, ''] })}
              >
                <Plus className="size-4" />
                Add DMR ID
              </Button>
              <div>
                <Button type="submit" disabled={saveProfileMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 max-w-sm">
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
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button type="submit" disabled={changePasswordMutation.isPending} className="self-start">
              <KeyRound className="size-4" />
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {me && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {me.admin && (
                <div className="flex items-baseline gap-2">
                  <Badge>Admin</Badge>
                  <span className="text-sm text-muted-foreground">
                    Full access to every permission-gated action in the app.
                  </span>
                </div>
              )}
              {me.permissions.map((p) => {
                const entry = permissionCatalog.find((c) => c.value === p)
                return (
                  <div key={p} className="flex items-baseline gap-2">
                    <Badge variant="secondary">{entry?.label ?? p}</Badge>
                    {entry && <span className="text-sm text-muted-foreground">{entry.description}</span>}
                  </div>
                )
              })}
              {!me.admin && me.permissions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You don't have any granted permissions. Contact an admin if you need access to something.
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                Permissions are managed by an admin — you can't edit your own here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
