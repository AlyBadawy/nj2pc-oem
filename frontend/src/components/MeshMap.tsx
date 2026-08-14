import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { IncidentBoundaryPoint, MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { linkColor, LINK_TYPE_LABEL } from '@/lib/meshVisual'
import { MeshCanvasFallback } from '@/components/MeshCanvasFallback'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  nodes: MeshNodeSnapshot[]
  links: MeshLinkSnapshot[]
  incidentLat?: string | null
  incidentLng?: string | null
  boundaryPoints?: IncidentBoundaryPoint[] | null
}

/** Plain inline-SVG circle markers instead of Leaflet's default raster icon set — sidesteps the
 * well-known "broken image" issues that PNG-based Leaflet icons run into under bundlers and on
 * some mobile browsers (no external/data-URI image to fail loading at all, just DOM + CSS). */
function nodeDivIcon(isLocalNode: boolean): L.DivIcon {
  const fill = isLocalNode ? '#1F4E79' : '#F7F5F0'
  const size = isLocalNode ? 18 : 14
  return L.divIcon({
    className: 'mesh-node-marker',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" fill="${fill}" stroke="#1F4E79" stroke-width="2.5" /></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function incidentDivIcon(): L.DivIcon {
  return L.divIcon({
    className: 'mesh-incident-marker',
    html: `<svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" fill="#C4432D" stroke="#F7F5F0" stroke-width="2" /></svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

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
export function MeshMap({ nodes, links, incidentLat, incidentLng, boundaryPoints }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [useFallback, setUseFallback] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current)
      // Entering/exiting the browser's native fullscreen "top layer" can leave Leaflet's tile
      // pane transform computed against a stale offset even after the container's reported
      // size is correct (tiles fetch fine — 200s — but paint at the wrong position, so the map
      // looks blank). A single invalidateSize() isn't reliably enough; re-check across the
      // transition since layout can still be settling when the event first fires.
      if (!mapRef.current) return
      mapRef.current.invalidateSize()
      for (const ms of [50, 150, 350, 700]) {
        setTimeout(() => mapRef.current?.invalidateSize(), ms)
      }
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
    // Only fall back to the offline canvas if tiles are genuinely unreachable — a resize (e.g.
    // entering/exiting fullscreen) can transiently fire a spurious tileerror even when tiles are
    // loading fine, so this requires a few failures AND zero successful loads before giving up,
    // and never reconsiders once real tiles have shown at least once.
    let tileLoadedOnce = false
    let tileErrorCount = 0
    tileLayer.on('tileload', () => {
      tileLoadedOnce = true
    })
    tileLayer.on('tileerror', () => {
      if (tileLoadedOnce) return
      tileErrorCount += 1
      if (tileErrorCount >= 4) setUseFallback(true)
    })
    tileLayer.addTo(map)

    // Robustly resize the map whenever its container's actual size changes (covers fullscreen
    // enter/exit and any other layout shift) instead of guessing at timing around events.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)

    const nodesByHost = new Map(nodes.map((n) => [n.hostname.toLowerCase(), n]))
    const points: L.LatLngExpression[] = []
    const hostPos = new Map<string, L.LatLng>()

    // The incident's boundary defines the mesh map's default view (not just the scanned nodes),
    // so it's drawn first, underneath everything else, and its points are folded into the
    // fitBounds() call below.
    const boundaryLatLngs = (boundaryPoints ?? [])
      .map((p) => {
        const lat = toNum(p.latitude)
        const lng = toNum(p.longitude)
        return lat != null && lng != null ? L.latLng(lat, lng) : null
      })
      .filter((v): v is L.LatLng => v != null)
    if (boundaryLatLngs.length >= 3) {
      L.polygon(boundaryLatLngs, {
        color: '#1F4E79',
        weight: 2,
        fillColor: '#1F4E79',
        fillOpacity: 0.2,
      }).addTo(map)
      points.push(...boundaryLatLngs)
    }

    for (const n of nodes) {
      const lat = toNum(n.latitude)
      const lng = toNum(n.longitude)
      if (lat == null || lng == null) continue
      const latLng = L.latLng(lat, lng)
      hostPos.set(n.hostname.toLowerCase(), latLng)
      points.push(latLng)
      const label = n.channel ? `${n.hostname} (${n.band ?? ''} ch ${n.channel})` : n.hostname
      L.marker(latLng, { icon: nodeDivIcon(n.isLocalNode) })
        .addTo(map)
        .bindTooltip(label, { permanent: false })
    }

    const incLat = toNum(incidentLat)
    const incLng = toNum(incidentLng)
    if (incLat != null && incLng != null) {
      const incidentLatLng = L.latLng(incLat, incLng)
      points.push(incidentLatLng)
      L.marker(incidentLatLng, { icon: incidentDivIcon() }).addTo(map).bindTooltip('Incident location')
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
        color: linkColor(link.linkTypeNormalized, fromNode?.channel ?? null),
        weight: 3,
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
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [nodes, links, incidentLat, incidentLng, boundaryPoints, useFallback])

  return (
    <div
      ref={wrapperRef}
      // `isolate` contains Leaflet's internal pane z-indices (up to 700, for tiles/markers/
      // tooltips) inside this element's own stacking context — without it, those high
      // z-indices leak out and render above page-level UI like Dialog/modal overlays (which
      // use a much lower z-50), even though the Dialog is portaled later in the DOM.
      className={cn(
        'relative isolate',
        isFullscreen && 'fixed inset-0 h-screen w-screen bg-credential-paper',
      )}
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
      {/* A separate outer div carries the absolute/fixed sizing for fullscreen — Leaflet sets
          `position: relative` as an inline style on its own container (needed for its internal
          absolutely-positioned panes), which as an inline style always wins over any `position`
          utility class placed directly on that same element. Keeping the sizing on a wrapper
          one level up avoids that fight entirely. */}
      <div className={isFullscreen ? 'absolute inset-0' : 'w-full h-[420px]'}>
        {useFallback ? (
          <MeshCanvasFallback
            nodes={nodes}
            links={links}
            incidentLat={incidentLat}
            incidentLng={incidentLng}
            boundaryPoints={boundaryPoints}
            className="w-full h-full"
          />
        ) : (
          <div
            ref={containerRef}
            className={cn('w-full h-full rounded-lg border border-credential-hairline', isFullscreen && 'rounded-none border-none')}
          />
        )}
      </div>
    </div>
  )
}
