import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png?url'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png?url'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png?url'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { linkColor, LINK_TYPE_DASH, LINK_TYPE_LABEL } from '@/lib/meshVisual'
import { MeshCanvasFallback } from '@/components/MeshCanvasFallback'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Leaflet's default marker icon paths break under Vite bundling — fix on module load, before
// any marker is ever placed, so this isn't discovered later as "map shows no markers."
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
})

type Props = {
  nodes: MeshNodeSnapshot[]
  links: MeshLinkSnapshot[]
  incidentLat?: string | null
  incidentLng?: string | null
}

const localNodeIcon = new L.Icon.Default({ className: 'mesh-local-node-marker' })

function toNum(v: string | null | undefined): number | null {
  const n = v ? Number(v) : NaN
  return Number.isNaN(n) ? null : n
}

function linkTooltip(link: MeshLinkSnapshot, fromNodeChannel: string | null, fromNodeBand: string | null): string {
  const parts = [LINK_TYPE_LABEL[link.linkTypeNormalized]]
  if (link.linkTypeNormalized === 'RF') {
    if (fromNodeBand) parts.push(fromNodeBand)
    if (fromNodeChannel) parts.push(`ch ${fromNodeChannel}`)
  }
  if (link.rxPercent) parts.push(`rx ${link.rxPercent}`)
  return `${link.fromHostname} → ${link.toHostname}: ${parts.join(' · ')}`
}

/** Hybrid map: tries Leaflet + OpenStreetMap tiles first, falls back to the offline canvas
 * renderer if tiles fail to load (mesh-isolated, no path to the internet) or if the browser
 * already reports itself offline. Both renderers take the identical prop shape. Supports a
 * fullscreen toggle (native Fullscreen API) so either renderer can be expanded to fill the
 * whole browser viewport. */
export function MeshMap({ nodes, links, incidentLat, incidentLng }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [useFallback, setUseFallback] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === wrapperRef.current
      setIsFullscreen(active)
      requestAnimationFrame(() => mapRef.current?.invalidateSize())
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapperRef.current?.requestFullscreen()
    }
  }

  useEffect(() => {
    if (useFallback) return
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, { attributionControl: true })
    mapRef.current = map

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    })
    let failed = false
    tileLayer.on('tileerror', () => {
      if (failed) return
      failed = true
      setUseFallback(true)
    })
    tileLayer.addTo(map)

    const nodesByHost = new Map(nodes.map((n) => [n.hostname.toLowerCase(), n]))
    const points: L.LatLngExpression[] = []
    const hostPos = new Map<string, L.LatLng>()

    for (const n of nodes) {
      const lat = toNum(n.latitude)
      const lng = toNum(n.longitude)
      if (lat == null || lng == null) continue
      const latLng = L.latLng(lat, lng)
      hostPos.set(n.hostname.toLowerCase(), latLng)
      points.push(latLng)
      const label = n.channel ? `${n.hostname} (${n.band ?? ''} ch ${n.channel})` : n.hostname
      L.marker(latLng, { icon: n.isLocalNode ? localNodeIcon : new L.Icon.Default() })
        .addTo(map)
        .bindTooltip(label, { permanent: false })
    }

    const incLat = toNum(incidentLat)
    const incLng = toNum(incidentLng)
    if (incLat != null && incLng != null) {
      const incidentLatLng = L.latLng(incLat, incLng)
      points.push(incidentLatLng)
      L.circleMarker(incidentLatLng, { radius: 7, color: '#C4432D', fillColor: '#C4432D', fillOpacity: 1 })
        .addTo(map)
        .bindTooltip('Incident location')
    }

    for (const link of links) {
      const from = hostPos.get(link.fromHostname.toLowerCase())
      const to = hostPos.get(link.toHostname.toLowerCase())
      if (!from || !to) continue
      // A link's band/channel is whatever radio the FROM node used to reach this neighbor —
      // not a single "the" local node (a fanned-out scan visits many nodes, each with its own
      // RF configuration).
      const fromNode = nodesByHost.get(link.fromHostname.toLowerCase())
      L.polyline([from, to], {
        color: linkColor(link.linkTypeNormalized, fromNode?.band ?? null),
        weight: 3,
        dashArray: LINK_TYPE_DASH[link.linkTypeNormalized]?.join(',') || undefined,
      })
        .addTo(map)
        .bindTooltip(linkTooltip(link, fromNode?.channel ?? null, fromNode?.band ?? null))
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 15 })
    } else {
      map.setView([0, 0], 2)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [nodes, links, incidentLat, incidentLng, useFallback])

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', isFullscreen && 'flex flex-col bg-credential-paper p-2')}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="absolute top-2 right-2 z-[1000] bg-background"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Expand map to fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </Button>
      {useFallback ? (
        <MeshCanvasFallback
          nodes={nodes}
          links={links}
          incidentLat={incidentLat}
          incidentLng={incidentLng}
          className={isFullscreen ? 'flex-1 w-full' : 'w-full h-[420px]'}
        />
      ) : (
        <div
          ref={containerRef}
          className={cn(
            'rounded-lg border border-credential-hairline',
            isFullscreen ? 'flex-1 w-full' : 'w-full h-[420px]',
          )}
        />
      )}
    </div>
  )
}
