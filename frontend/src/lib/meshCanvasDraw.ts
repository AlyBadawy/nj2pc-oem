import type { IncidentBoundaryPoint, MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { linkColor, resolveLinkChannel, resourceTypeColor } from '@/lib/meshVisual'

export type MeshCanvasNode = MeshNodeSnapshot & { offSite?: boolean; resourceTypeName?: string | null }

export type MeshCanvasDrawInput = {
  nodes: MeshCanvasNode[]
  links: MeshLinkSnapshot[]
  boundaryPoints?: IncidentBoundaryPoint[] | null
}

export type Projector = (lat: number, lng: number) => [number, number]

function toNum(v: string | null | undefined): number | null {
  const n = v ? Number(v) : NaN
  return Number.isNaN(n) ? null : n
}

/** Draws the boundary polygon, links, node markers, and proximity badges — the parts shared by
 * both the plain lat/lng-grid renderer (`drawMeshCanvas`, self-computed projection) and a
 * live-tile compositor (real Leaflet/OSM map, projection via `map.latLngToContainerPoint`).
 * Takes an already-built `project` function so it has no opinion on what's behind it.
 * `showLabels` (default true) draws each node's hostname and each RF link's channel as
 * permanent text — the offline fallback and mesh-scan PDF export rely on these since there's no
 * hover affordance in a static image, but a busy incident-wide map (many nodes close together)
 * can ask for `false` to keep just the color-coded markers/links, since overlapping text there
 * becomes illegible rather than useful. */
export function drawMeshOverlay(
  ctx: CanvasRenderingContext2D,
  input: MeshCanvasDrawInput,
  project: Projector,
  showLabels = true,
) {
  const { nodes, links, boundaryPoints } = input

  const boundary = (boundaryPoints ?? [])
    .map((p) => {
      const lat = toNum(p.latitude)
      const lng = toNum(p.longitude)
      return lat != null && lng != null ? { lat, lng } : null
    })
    .filter((v): v is { lat: number; lng: number } => v != null)

  if (boundary.length >= 3) {
    ctx.beginPath()
    boundary.forEach((p, i) => {
      const [x, y] = project(p.lat, p.lng)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(31, 78, 121, 0.2)'
    ctx.fill()
    ctx.strokeStyle = '#1F4E79'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  const nodesByHost = new Map(nodes.map((n) => [n.hostname.toLowerCase(), n]))
  const hostPos = new Map<string, [number, number]>()
  for (const n of nodes) {
    const lat = toNum(n.latitude)
    const lng = toNum(n.longitude)
    if (lat != null && lng != null) hostPos.set(n.hostname.toLowerCase(), project(lat, lng))
  }

  for (const link of links) {
    const from = hostPos.get(link.fromHostname.toLowerCase())
    const to = hostPos.get(link.toHostname.toLowerCase())
    if (!from || !to) continue
    // A link's band/channel is whatever radio the FROM node used to reach this neighbor — not
    // the single node the whole scan started from (a fanned-out scan visits many nodes, each
    // with its own RF configuration).
    const fromNode = nodesByHost.get(link.fromHostname.toLowerCase())
    const toNode = nodesByHost.get(link.toHostname.toLowerCase())
    const involvesOffSite = !!fromNode?.offSite || !!toNode?.offSite
    const linkChannel = resolveLinkChannel(link.linkTypeNormalized, fromNode?.channel, toNode?.channel)
    ctx.strokeStyle = linkColor(link.linkTypeNormalized, linkChannel)
    ctx.lineWidth = involvesOffSite ? 1.5 : 2
    ctx.globalAlpha = involvesOffSite ? 0.45 : 1
    ctx.beginPath()
    ctx.moveTo(from[0], from[1])
    ctx.lineTo(to[0], to[1])
    ctx.stroke()
    ctx.globalAlpha = 1

    if (showLabels && link.linkTypeNormalized === 'RF' && linkChannel) {
      const midX = (from[0] + to[0]) / 2
      const midY = (from[1] + to[1]) / 2
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      const label = `ch ${linkChannel}`
      const metrics = ctx.measureText(label)
      ctx.fillStyle = '#F7F5F0'
      ctx.fillRect(midX - metrics.width / 2 - 3, midY - 12, metrics.width + 6, 14)
      ctx.fillStyle = '#14181D'
      ctx.fillText(label, midX, midY - 1)
    }
  }

  for (const n of nodes) {
    const lat = toNum(n.latitude)
    const lng = toNum(n.longitude)
    if (lat == null || lng == null) continue
    const [x, y] = project(lat, lng)
    ctx.beginPath()
    ctx.arc(x, y, n.isLocalNode ? 6 : 5, 0, Math.PI * 2)
    ctx.fillStyle = n.resourceTypeName
      ? resourceTypeColor(n.resourceTypeName)
      : n.offSite
        ? '#B9B3A6'
        : n.isLocalNode
          ? '#1F4E79'
          : '#F7F5F0'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1F4E79'
    if (n.offSite) ctx.setLineDash([3, 3])
    ctx.stroke()
    if (n.offSite) ctx.setLineDash([])
    if (showLabels) {
      ctx.fillStyle = '#14181D'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(n.offSite ? `${n.hostname} (off-site)` : n.hostname, x, y - 10)
    }
  }
}

/** Self-contained plain lat/lng-grid renderer — no basemap imagery, computes its own bounds and
 * projection from the node/boundary points, draws a grid + distance scale, then delegates the
 * actual content (links/nodes/badges) to `drawMeshOverlay`. Used by the offline map fallback and
 * as the mesh-scan PDF export's map when no live tile-based map is available to capture. */
export function drawMeshCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: MeshCanvasDrawInput,
  showLabels = true,
) {
  const { nodes, boundaryPoints } = input

  type Pt = { lat: number; lng: number }

  const points: Pt[] = []
  for (const n of nodes) {
    const lat = toNum(n.latitude)
    const lng = toNum(n.longitude)
    if (lat != null && lng != null) points.push({ lat, lng })
  }
  const boundary: Pt[] = (boundaryPoints ?? [])
    .map((p) => {
      const lat = toNum(p.latitude)
      const lng = toNum(p.longitude)
      return lat != null && lng != null ? { lat, lng } : null
    })
    .filter((v): v is Pt => v != null)
  points.push(...boundary)

  if (points.length === 0) {
    ctx.fillStyle = '#8A8A8A'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No node locations to plot', width / 2, height / 2)
    return
  }

  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latSpan = Math.max(maxLat - minLat, 0.005)
  const lngSpan = Math.max(maxLng - minLng, 0.005)
  const padding = 40

  const project: Projector = (lat, lng) => {
    const x = padding + ((lng - minLng) / lngSpan) * (width - padding * 2)
    const y = height - padding - ((lat - minLat) / latSpan) * (height - padding * 2)
    return [x, y]
  }

  ctx.strokeStyle = '#E5E1D8'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const x = padding + (i / 4) * (width - padding * 2)
    const y = padding + (i / 4) * (height - padding * 2)
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  const milesPerPixel = (latSpan * 69) / (height - padding * 2)
  const scaleBarMiles = Math.max(0.1, Math.round(milesPerPixel * 80 * 10) / 10)
  ctx.strokeStyle = '#14181D'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(padding, height - 14)
  ctx.lineTo(padding + 80, height - 14)
  ctx.stroke()
  ctx.fillStyle = '#14181D'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`~${scaleBarMiles} mi`, padding, height - 20)

  drawMeshOverlay(ctx, input, project, showLabels)
}
