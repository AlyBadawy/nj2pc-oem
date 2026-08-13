import type { ResourceTypeField } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type CustomFieldValues = Record<string, string | number | boolean>

export function CustomFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: ResourceTypeField[]
  values: CustomFieldValues
  onChange: (values: CustomFieldValues) => void
}) {
  if (fields.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-2 border-t">
        <p className="text-sm font-medium pt-4 pb-2">Additional Details</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const id = `customField-${field.id}`
          const value = values[field.name]

          if (field.fieldType === 'BOOLEAN') {
            return (
              <label key={field.id} className="flex items-center gap-2 text-sm pt-6">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange({ ...values, [field.name]: e.target.checked })}
                />
                {field.name}
              </label>
            )
          }

          if (field.fieldType === 'SELECT') {
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                <Label htmlFor={id}>
                  {field.name}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={value != null ? String(value) : ''}
                  onValueChange={(v) => onChange({ ...values, [field.name]: v })}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }

          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>
                {field.name}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id={id}
                type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                value={value != null ? String(value) : ''}
                onChange={(e) =>
                  onChange({
                    ...values,
                    [field.name]:
                      field.fieldType === 'NUMBER' && e.target.value !== '' ? e.target.valueAsNumber : e.target.value,
                  })
                }
                required={field.required}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
