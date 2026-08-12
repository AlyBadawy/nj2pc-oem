import { Plus, X, Loader2 } from 'lucide-react'
import type { OperatorFormState } from '@/lib/operatorForm'
import type { OperatorStatus } from '@/lib/types'
import { permissionCatalog } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function SectionHeading({ children }: { children: string }) {
  return (
    <div className="pt-2 border-t">
      <p className="text-sm font-medium pt-4 pb-2">{children}</p>
    </div>
  )
}

export function OperatorFormFields({
  form,
  setForm,
  mode,
  lookupLoading,
  onCallsignBlur,
}: {
  form: OperatorFormState
  setForm: (form: OperatorFormState) => void
  mode: 'create' | 'edit'
  lookupLoading?: boolean
  onCallsignBlur?: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="callsign" className="flex items-center gap-1.5">
            Callsign
            {lookupLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </Label>
          <Input
            id="callsign"
            value={form.callsign}
            onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
            onBlur={onCallsignBlur}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="licenseClass">License Class</Label>
          <Input
            id="licenseClass"
            value={form.licenseClass}
            onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>DMR ID{form.dmrIds.length > 1 ? 's' : ''}</Label>
        {form.dmrIds.length === 0 && (
          <p className="text-sm text-muted-foreground">No DMR IDs added yet.</p>
        )}
        {form.dmrIds.map((dmrId, index) => (
          <div key={index} className="flex items-center gap-2 max-w-sm">
            <Input
              value={dmrId}
              onChange={(e) => {
                const next = [...form.dmrIds]
                next[index] = e.target.value
                setForm({ ...form, dmrIds: next })
              }}
              placeholder="3123456"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setForm({ ...form, dmrIds: form.dmrIds.filter((_, i) => i !== index) })}
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
          onClick={() => setForm({ ...form, dmrIds: [...form.dmrIds, ''] })}
        >
          <Plus className="size-4" />
          Add DMR ID
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(value: OperatorStatus) => setForm({ ...form, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <SectionHeading>Address</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="addressLine1">Street</Label>
          <Input
            id="addressLine1"
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addressLine2">City, State ZIP</Label>
          <Input
            id="addressLine2"
            value={form.addressLine2}
            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addressAttn">Attn</Label>
          <Input
            id="addressAttn"
            value={form.addressAttn}
            onChange={(e) => setForm({ ...form, addressAttn: e.target.value })}
          />
        </div>
      </div>

      <SectionHeading>Location</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            placeholder="40.8915158"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            placeholder="-74.1959347"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gridSquare">Grid Square</Label>
          <Input
            id="gridSquare"
            value={form.gridSquare}
            onChange={(e) => setForm({ ...form, gridSquare: e.target.value })}
            placeholder="FN20vv"
          />
        </div>
      </div>

      <SectionHeading>Account Access</SectionHeading>
      <div className="flex flex-col gap-1.5 max-w-sm">
        <Label htmlFor="password">
          Password{mode === 'create' && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Required'}
          autoComplete="new-password"
          required={mode === 'create'}
          minLength={8}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Permissions</Label>
        {permissionCatalog.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.permissions.includes(option.value)}
              onChange={(e) =>
                setForm({
                  ...form,
                  permissions: e.target.checked
                    ? [...form.permissions, option.value]
                    : form.permissions.filter((p) => p !== option.value),
                })
              }
            />
            <span>
              <span className="font-medium">{option.label}</span>{' '}
              <span className="text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
