import type { IncidentBoundaryPoint } from '@/lib/types'

export type LatLngBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number }

function toNum(v: string | null | undefined): number | null {
  const n = v ? Number(v) : NaN
  return Number.isNaN(n) ? null : n
}

type BoundsNode = { latitude: string | null; longitude: string | null; offSite?: boolean }

/** The incident's "area of interest" for map purposes: the boundary if one is drawn (3+
 * points), else the bounding box of on-site (non-off-site) node positions as a fallback so the
 * map still has something sensible to focus on before a boundary has been set. Returns null when
 * there's nothing to go on at all. */
export function computeIncidentBounds(
  boundaryPoints: IncidentBoundaryPoint[] | null | undefined,
  nodes: BoundsNode[],
): LatLngBounds | null {
  const boundaryLatLngs = (boundaryPoints ?? [])
    .map((p) => {
      const lat = toNum(p.latitude)
      const lng = toNum(p.longitude)
      return lat != null && lng != null ? { lat, lng } : null
    })
    .filter((v): v is { lat: number; lng: number } => v != null)

  const source =
    boundaryLatLngs.length >= 3
      ? boundaryLatLngs
      : nodes
          .filter((n) => !n.offSite)
          .map((n) => {
            const lat = toNum(n.latitude)
            const lng = toNum(n.longitude)
            return lat != null && lng != null ? { lat, lng } : null
          })
          .filter((v): v is { lat: number; lng: number } => v != null)

  if (source.length === 0) return null

  return {
    minLat: Math.min(...source.map((p) => p.lat)),
    maxLat: Math.max(...source.map((p) => p.lat)),
    minLng: Math.min(...source.map((p) => p.lng)),
    maxLng: Math.max(...source.map((p) => p.lng)),
  }
}

const EARTH_RADIUS_MILES = 3958.8

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const FAR_PADDING_MILES = 1

/** A node counts as "far from the incident" if it's outside the incident bounds by more than a
 * mile of padding — generous enough that nodes just outside a small boundary still count as part
 * of the site, while a relay/gateway dozens of miles away doesn't. */
export function isFarFromIncident(lat: number, lng: number, bounds: LatLngBounds): boolean {
  const nearestLat = Math.min(Math.max(lat, bounds.minLat), bounds.maxLat)
  const nearestLng = Math.min(Math.max(lng, bounds.minLng), bounds.maxLng)
  return haversineMiles(lat, lng, nearestLat, nearestLng) > FAR_PADDING_MILES
}
