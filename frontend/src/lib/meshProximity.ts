const PROXIMITY_THRESHOLD_FEET = 10
const EARTH_RADIUS_FEET = 20925646.3

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineFeet(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_FEET * c
}

export type ProximityPoint = { hostname: string; lat: number; lng: number }
export type ProximityGroup = { hostnames: string[]; centerLat: number; centerLng: number }

/** Groups nodes whose reported GPS positions are within `PROXIMITY_THRESHOLD_FEET` of each
 * other (transitively — union-find, not just direct pairs) — e.g. two nodes mounted on the same
 * mast will typically report near-identical coordinates, which would otherwise render as
 * perfectly overlapping markers with no visual indication that more than one node is there.
 * Only returns groups of 2+; solitary nodes aren't included. */
export function findColocatedGroups(points: ProximityPoint[]): ProximityGroup[] {
  const n = points.length
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineFeet(points[i].lat, points[i].lng, points[j].lat, points[j].lng) <= PROXIMITY_THRESHOLD_FEET) {
        union(i, j)
      }
    }
  }

  const byRoot = new Map<number, ProximityPoint[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!byRoot.has(root)) byRoot.set(root, [])
    byRoot.get(root)!.push(points[i])
  }

  const groups: ProximityGroup[] = []
  for (const members of byRoot.values()) {
    if (members.length < 2) continue
    groups.push({
      hostnames: members.map((m) => m.hostname),
      centerLat: members.reduce((sum, m) => sum + m.lat, 0) / members.length,
      centerLng: members.reduce((sum, m) => sum + m.lng, 0) / members.length,
    })
  }
  return groups
}
