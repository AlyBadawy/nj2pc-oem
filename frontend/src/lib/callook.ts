export interface CallookResponse {
  status: 'VALID' | 'INVALID' | 'UPDATED'
  type?: 'PERSON' | 'CLUB' | 'MILITARY'
  current?: {
    callsign: string
    operClass: string
  }
  name?: string
  address?: {
    line1: string
    line2: string
  }
  location?: {
    latitude: string
    longitude: string
    gridsquare: string
  }
}

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function lookupCallsign(callsign: string): Promise<CallookResponse | null> {
  const trimmed = callsign.trim()
  if (!trimmed) return null
  try {
    const response = await fetch(`https://callook.info/${encodeURIComponent(trimmed)}/json`)
    if (!response.ok) return null
    return (await response.json()) as CallookResponse
  } catch {
    return null
  }
}

export function formatCallookName(name: string): string {
  return toTitleCase(name)
}

export function formatCallookLicenseClass(operClass: string): string {
  return toTitleCase(operClass)
}

export function formatCallookAddress(result: CallookResponse): string {
  const lines: string[] = []
  if (result.address?.line1) lines.push(result.address.line1)
  if (result.address?.line2) lines.push(result.address.line2)
  if (result.location?.gridsquare) lines.push(`Grid Square: ${result.location.gridsquare}`)
  return lines.join('\n')
}
