import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import L from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { IncidentBoundaryPoint, MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { linkColor, LINK_TYPE_LABEL, resolveLinkChannel, resourceTypeColor } from '@/lib/meshVisual'
import { captureLiveLeafletSnapshot } from '@/lib/meshMapCapture'
import { computeIncidentBounds } from '@/lib/meshIncidentArea'
import { drawMeshCanvas } from '@/lib/meshCanvasDraw'
import { MeshCanvasFallback } from '@/components/MeshCanvasFallback'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MeshMapNode = MeshNodeSnapshot & { offSite?: boolean; resourceTypeName?: string | null }

type Props = {
  nodes: MeshMapNode[]
  links: MeshLinkSnapshot[]
  boundaryPoints?: IncidentBoundaryPoint[] | null
}

export type MeshMapHandle = {
  /** Snapshots exactly what's currently on screen (same tiles, same pan/zoom) as a PNG data URL
   * — used for the mesh-scan PDF export. Pass `overrides` to render a different node/link set
   * than the live map currently shows (e.g. the PDF's "RF only" filter, or excluding off-site/
   * far-away nodes) without disturbing the on-screen view. `showLabels: false` drops the
   * permanent per-node hostname / per-link channel text (see meshCanvasDraw.ts) — useful for a
   * busy, incident-wide view where overlapping labels would just be noise; defaults to true
   * (unchanged) for callers that don't pass it. Returns null if there's nothing to capture yet
   * (map not initialized). */
  captureSnapshot: (overrides?: { nodes?: MeshMapNode[]; links?: MeshLinkSnapshot[]; showLabels?: boolean }) => string | null
}

/** Plain inline-SVG circle markers instead of Leaflet's default raster icon set — sidesteps the
 * well-known "broken image" issues that PNG-based Leaflet icons run into under bundlers and on
 * some mobile browsers (no external/data-URI image to fail loading at all, just DOM + CSS).
 * Off-site nodes (checked in but not physically at the incident) get a dashed outline and a
 * muted fill instead of the usual local/other distinction — a marker icon is a fixed-size DOM
 * element that doesn't get reprojected on zoom, so a dash pattern is safe here (unlike the
 * polylines below, which lose dash patterns across zoom levels). */
function nodeDivIcon(isLocalNode: boolean, offSite: boolean, typeName?: string | null): L.DivIcon {
  const fill = typeName ? resourceTypeColor(typeName) : offSite ? '#B9B3A6' : isLocalNode ? '#1F4E79' : '#F7F5F0'
  const size = isLocalNode ? 18 : 14
  const dash = offSite ? ' stroke-dasharray="2.5,2"' : ''
  return L.divIcon({
    className: 'mesh-node-marker',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" fill="${fill}" stroke="#1F4E79" stroke-width="2.5"${dash} /></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function toNum(v: string | null | undefined): number | null {
  const n = v ? Number(v) : NaN
  return Number.isNaN(n) ? null : n
}

function linkTooltip(
  link: MeshLinkSnapshot,
  fromNodeChannel: string | null,
  fromNodeBand: string | null,
  fromOffSite: boolean,
  toOffSite: boolean,
): string {
  const parts = [LINK_TYPE_LABEL[link.linkTypeNormalized]]
  if (link.linkTypeNormalized === 'RF') {
    if (fromNodeBand) parts.push(fromNodeBand)
    if (fromNodeChannel) parts.push(`ch ${fromNodeChannel}`)
  }
  if (link.rxPercent) parts.push(`rx ${link.rxPercent}`)
  const from = fromOffSite ? `${link.fromHostname} (off-site)` : link.fromHostname
  const to = toOffSite ? `${link.toHostname} (off-site)` : link.toHostname
  return `${from} → ${to}: ${parts.join(' · ')}`
}

/** Hybrid map: tries Leaflet + OpenStreetMap tiles first, falls back to the offline canvas
 * renderer if tiles fail to load (mesh-isolated, no path to the internet) or if the browser
 * already reports itself offline. Both renderers take the identical prop shape. Supports a
 * fullscreen toggle (native Fullscreen API) so either renderer can be expanded to fill the
 * whole browser viewport. Exposes `captureSnapshot()` via ref for the mesh-scan PDF export. */
export const MeshMap = forwardRef<MeshMapHandle, Props>(function MeshMap({ nodes, links, boundaryPoints }, forwardedRef) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const [useFallback, setUseFallback] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useImperativeHandle(forwardedRef, () => ({
    captureSnapshot: (overrides) => {
      const effectiveNodes = overrides?.nodes ?? nodes
      const effectiveLinks = overrides?.links ?? links
      const showLabels = overrides?.showLabels ?? true
      if (useFallback) {
        // No overrides: the live fallback canvas is already an exact match for what's on
        // screen, so just grab it directly instead of re-rendering. With overrides, redraw
        // offscreen at the same size so the export can differ from the live view (e.g. the PDF
        // excluding off-site/far nodes) without disturbing what's actually shown on screen.
        if (!overrides) {
          return fallbackCanvasRef.current?.toDataURL('image/png') ?? null
        }
        const liveCanvas = fallbackCanvasRef.current
        if (!liveCanvas) return null
        const canvas = document.createElement('canvas')
        canvas.width = liveCanvas.width
        canvas.height = liveCanvas.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const dpr = window.devicePixelRatio || 1
        ctx.scale(dpr, dpr)
        const width = liveCanvas.width / dpr
        const height = liveCanvas.height / dpr
        ctx.fillStyle = '#F7F5F0'
        ctx.fillRect(0, 0, width, height)
        drawMeshCanvas(ctx, width, height, { nodes: effectiveNodes, links: effectiveLinks, boundaryPoints }, showLabels)
        return canvas.toDataURL('image/png')
      }
      if (!mapRef.current || !containerRef.current) return null
      return captureLiveLeafletSnapshot(
        mapRef.current,
        containerRef.current,
        {
          nodes: effectiveNodes,
          links: effectiveLinks,
          boundaryPoints,
        },
        showLabels,
      )
    },
  }))

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
      // Required for the PDF export to be able to read tile pixels back out of the canvas —
      // without this, even though OSM sends CORS headers, the browser still treats the canvas
      // as tainted and toDataURL() throws.
      crossOrigin: true,
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
      const baseLabel = n.channel ? `${n.hostname} (${n.band ?? ''} ch ${n.channel})` : n.hostname
      const typedLabel = n.resourceTypeName ? `${baseLabel} — ${n.resourceTypeName}` : baseLabel
      const label = n.offSite ? `${typedLabel} (off-site)` : typedLabel
      L.marker(latLng, { icon: nodeDivIcon(n.isLocalNode, !!n.offSite, n.resourceTypeName) })
        .addTo(map)
        .bindTooltip(label, { permanent: false })
    }

    for (const link of links) {
      const from = hostPos.get(link.fromHostname.toLowerCase())
      const to = hostPos.get(link.toHostname.toLowerCase())
      if (!from || !to) continue
      // A link's band/channel is whatever radio the FROM node used to reach this neighbor —
      // not a single "the" local node (a fanned-out scan visits many nodes, each with its own
      // RF configuration).
      const fromNode = nodesByHost.get(link.fromHostname.toLowerCase())
      const toNode = nodesByHost.get(link.toHostname.toLowerCase())
      const involvesOffSite = !!fromNode?.offSite || !!toNode?.offSite
      const linkChannel = resolveLinkChannel(link.linkTypeNormalized, fromNode?.channel, toNode?.channel)
      L.polyline([from, to], {
        color: linkColor(link.linkTypeNormalized, linkChannel),
        weight: involvesOffSite ? 2 : 3,
        opacity: involvesOffSite ? 0.45 : 1,
      })
        .addTo(map)
        .bindTooltip(linkTooltip(link, linkChannel, fromNode?.band ?? null, !!fromNode?.offSite, !!toNode?.offSite))
    }

    // Default view prioritizes the incident's own area (boundary, or on-site nodes if no
    // boundary is drawn yet) over the full point set — a single far-off relay/gateway node
    // shouldn't zoom the map out to the point the actual incident site is a speck. Every node
    // is still plotted and reachable by panning/zooming out, this only affects the initial view.
    const incidentBounds = computeIncidentBounds(boundaryPoints, nodes)
    if (incidentBounds) {
      map.fitBounds(
        L.latLngBounds(
          L.latLng(incidentBounds.minLat, incidentBounds.minLng),
          L.latLng(incidentBounds.maxLat, incidentBounds.maxLng),
        ),
        { padding: [30, 30], maxZoom: 16 },
      )
    } else if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 15 })
    } else {
      map.setView([0, 0], 2)
    }

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [nodes, links, boundaryPoints, useFallback])

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
      <div className={isFullscreen ? 'absolute inset-0' : 'w-full h-[66vh]'}>
        {useFallback ? (
          <MeshCanvasFallback
            ref={fallbackCanvasRef}
            nodes={nodes}
            links={links}
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
})
