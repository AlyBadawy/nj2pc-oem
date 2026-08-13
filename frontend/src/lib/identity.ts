export interface OperatorIdentityIncident {
  id: number
  name: string
  ref: string
}

export interface OperatorIdentityData {
  id: number
  callsign: string
  name: string
  licenseClass: string | null
  role: string | null
  roleColor?: string | null
  roleAccessLevel?: string | null
  /** Whether the current viewer is permitted to see phone/email at all (server already
   * nulls the values below when false — this only controls which UI state renders). */
  canViewContact: boolean
  phone: string | null
  email: string | null
  /** Formatted "PLATE(STATE)" summary of the operator's vehicle(s), e.g. "H67-R23(NJ)" — empty
   * string means no vehicle on file, null means the viewer can't see it (masked like phone/email). */
  licensePlate?: string | null
  photoUrl?: string | null
  credentialNo?: string | null
  incident?: OperatorIdentityIncident | null
  assignment?: string | null
  checkedInAt?: string | null
}

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  let national = digits
  if (digits.length === 11 && digits.startsWith('1')) {
    national = digits.slice(1)
  }
  if (national.length !== 10) {
    return raw.length > 2 ? `${'•'.repeat(Math.max(raw.length - 2, 3))}${raw.slice(-2)}` : raw
  }
  const area = national.slice(0, 3)
  const last2 = national.slice(-2)
  return `+1 ${area} ••• ••${last2}`
}

export function maskEmail(raw: string): string {
  const at = raw.indexOf('@')
  if (at < 1) return raw
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const first = local.slice(0, 1)
  return `${first}${'•'.repeat(Math.max(local.length - 1, 4))}@${domain}`
}

/** Masks the plate number(s) in a "PLATE(STATE)" (or comma-separated multi-vehicle) summary,
 * keeping the state code(s) visible — mirrors maskPhone/maskEmail's partial-reveal pattern. */
export function maskPlate(raw: string): string {
  return raw.replace(/[^(),\s]+(?=\()/g, (plate) => '•'.repeat(Math.max(plate.length, 4)))
}

/** Presentational only — a stable, non-fabricated badge number derived from the operator's
 * own id. There is no real credential-numbering system behind this. */
export function credentialNoFor(operatorId: number): string {
  return `NO. ${String(operatorId).padStart(6, '0')}`
}

/** Presentational incident reference derived from the incident's own id/createdAt, not a
 * separately-tracked field. */
export function incidentRef(incidentId: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear()
  return `IC-${year}-${incidentId}`
}

export function formatElapsed(sinceIso: string): string {
  const ms = Date.now() - new Date(sinceIso).getTime()
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
