import type L from 'leaflet'
import { drawMeshOverlay, type MeshCanvasDrawInput } from '@/lib/meshCanvasDraw'

/** Composites the live Leaflet map (whatever tiles are currently loaded, at the current pan/zoom
 * the operator is looking at) plus our own overlay (links/nodes/proximity badges/boundary) into a
 * single PNG data URL — used for the mesh-scan PDF export so the map in the PDF matches what was
 * actually on screen, rather than a freshly-recomputed view.
 *
 * Tiles are read directly from the DOM (`.leaflet-tile-loaded` `<img>` elements) via
 * `getBoundingClientRect()` rather than replaying Leaflet's internal transform math — the browser
 * already knows each tile's exact on-screen position, so this is both simpler and immune to
 * drift from Leaflet's CSS transform internals changing between versions. This only works because
 * `MeshMap` requests tiles with `crossOrigin: true` and OpenStreetMap's tile servers send
 * `Access-Control-Allow-Origin: *` — without both of those the canvas would be security-tainted
 * and `toDataURL()` would throw. */
export function captureLiveLeafletSnapshot(map: L.Map, container: HTMLElement, input: MeshCanvasDrawInput): string {
  const rect = container.getBoundingClientRect()
  const width = Math.max(rect.width, 1)
  const height = Math.max(rect.height, 1)
  const dpr = window.devicePixelRatio || 1

  const canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#F7F5F0'
  ctx.fillRect(0, 0, width, height)

  const tiles = container.querySelectorAll<HTMLImageElement>('.leaflet-tile-loaded')
  for (const tile of Array.from(tiles)) {
    const tRect = tile.getBoundingClientRect()
    const x = tRect.left - rect.left
    const y = tRect.top - rect.top
    // A tile that failed to actually decode (network hiccup) would throw on drawImage; skip it
    // rather than aborting the whole capture over one missing square.
    try {
      ctx.drawImage(tile, x, y, tRect.width, tRect.height)
    } catch {
      // skip
    }
  }

  drawMeshOverlay(ctx, input, (lat, lng) => {
    const point = map.latLngToContainerPoint([lat, lng])
    return [point.x, point.y]
  })

  return canvas.toDataURL('image/png')
}
