import { useEffect, useRef } from 'react'
import type { MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { linkColor } from '@/lib/meshVisual'

type Props = {
  nodes: MeshNodeSnapshot[]
  links: MeshLinkSnapshot[]
  incidentLat?: string | null
  incidentLng?: string | null
  className?: string
}

/** Offline-safe map fallback: no basemap imagery, just a lat/lng grid with a distance scale —
 * always renders, even fully mesh-isolated with no path to the internet. Redraws at whatever
 * size its container is (via ResizeObserver), so it also works correctly in fullscreen. */
export function MeshCanvasFallback({ nodes, links, incidentLat, incidentLng, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    function draw() {
      if (!wrapper || !canvas) return
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(rect.width, 200)
      const height = Math.max(rect.height, 200)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      ctx.fillStyle = '#F7F5F0'
      ctx.fillRect(0, 0, width, height)

      type Pt = { lat: number; lng: number }
      const toNum = (v: string | null | undefined) => {
        const n = v ? Number(v) : NaN
        return Number.isNaN(n) ? null : n
      }

      const points: Pt[] = []
      for (const n of nodes) {
        const lat = toNum(n.latitude)
        const lng = toNum(n.longitude)
        if (lat != null && lng != null) points.push({ lat, lng })
      }
      const incLat = toNum(incidentLat)
      const incLng = toNum(incidentLng)
      if (incLat != null && incLng != null) points.push({ lat: incLat, lng: incLng })

      const nodesByHost = new Map(nodes.map((n) => [n.hostname.toLowerCase(), n]))

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

      function project(lat: number, lng: number): [number, number] {
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
        // A link's band/channel is whatever radio the FROM node used to reach this neighbor —
        // not the single node the whole scan started from (a fanned-out scan visits many nodes,
        // each with its own RF configuration).
        const fromNode = nodesByHost.get(link.fromHostname.toLowerCase())
        ctx.strokeStyle = linkColor(link.linkTypeNormalized, fromNode?.channel ?? null)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(from[0], from[1])
        ctx.lineTo(to[0], to[1])
        ctx.stroke()

        if (link.linkTypeNormalized === 'RF' && fromNode?.channel) {
          const midX = (from[0] + to[0]) / 2
          const midY = (from[1] + to[1]) / 2
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          const label = `ch ${fromNode.channel}`
          const metrics = ctx.measureText(label)
          ctx.fillStyle = '#F7F5F0'
          ctx.fillRect(midX - metrics.width / 2 - 3, midY - 12, metrics.width + 6, 14)
          ctx.fillStyle = '#14181D'
          ctx.fillText(label, midX, midY - 1)
        }
      }

      if (incLat != null && incLng != null) {
        const [x, y] = project(incLat, incLng)
        ctx.fillStyle = '#C4432D'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#F7F5F0'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      for (const n of nodes) {
        const lat = toNum(n.latitude)
        const lng = toNum(n.longitude)
        if (lat == null || lng == null) continue
        const [x, y] = project(lat, lng)
        ctx.beginPath()
        ctx.arc(x, y, n.isLocalNode ? 6 : 5, 0, Math.PI * 2)
        ctx.fillStyle = n.isLocalNode ? '#1F4E79' : '#F7F5F0'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#1F4E79'
        ctx.stroke()
        ctx.fillStyle = '#14181D'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(n.hostname, x, y - 10)
      }
    }

    draw()
    const observer = new ResizeObserver(() => draw())
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [nodes, links, incidentLat, incidentLng])

  return (
    <div ref={wrapperRef} className={className ?? 'w-full h-[420px]'}>
      <canvas ref={canvasRef} className="rounded-lg border border-credential-hairline bg-credential-paper" />
    </div>
  )
}
