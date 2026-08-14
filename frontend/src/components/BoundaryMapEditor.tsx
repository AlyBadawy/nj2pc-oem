import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Trash2 } from 'lucide-react'
import type { IncidentBoundaryPoint } from '@/lib/types'
import { Button } from '@/components/ui/button'

type Props = {
  points: IncidentBoundaryPoint[]
  onChange: (points: IncidentBoundaryPoint[]) => void
  centerLat?: string | null
  centerLng?: string | null
}

function pointDivIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: 'boundary-point-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:#1F4E79;color:#F7F5F0;font:600 11px sans-serif;border:2px solid #F7F5F0;">${index + 1}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/** Click-to-drop-pins boundary editor. Renders a Leaflet + OSM map; each click appends an
 * ordered point, drawn as a numbered marker with the perimeter connected by a polygon (shaded
 * at 20% opacity once there are 3+ points, matching the shading used everywhere the boundary is
 * displayed — see `MeshMap`/`MeshCanvasFallback`). Points are also editable/removable via the
 * list below the map, since a mis-placed click is otherwise hard to undo precisely. */
export function BoundaryMapEditor({ points, onChange, centerLat, centerLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const pointsRef = useRef(points)
  pointsRef.current = points

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const lat = centerLat ? Number(centerLat) : NaN
    const lng = centerLng ? Number(centerLng) : NaN
    const hasCenter = !Number.isNaN(lat) && !Number.isNaN(lng)
    const initialCenter: L.LatLngExpression = hasCenter ? [lat, lng] : [39.8283, -98.5795]

    const map = L.map(container).setView(initialCenter, hasCenter ? 14 : 4)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup

    map.on('click', (e: L.LeafletMouseEvent) => {
      onChange([...pointsRef.current, { latitude: String(e.latlng.lat), longitude: String(e.latlng.lng) }])
    })

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      layerGroupRef.current = null
    }
    // Map is initialized once; point/marker sync happens in the effect below via the layer
    // group ref, and onChange reads the latest points through pointsRef — re-running this
    // effect on every point change would tear down and rebuild the whole map on each click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const layerGroup = layerGroupRef.current
    if (!layerGroup) return
    layerGroup.clearLayers()

    const latLngs = points
      .map((p) => {
        const lat = Number(p.latitude)
        const lng = Number(p.longitude)
        return Number.isNaN(lat) || Number.isNaN(lng) ? null : L.latLng(lat, lng)
      })
      .filter((v): v is L.LatLng => v != null)

    latLngs.forEach((ll, i) => L.marker(ll, { icon: pointDivIcon(i) }).addTo(layerGroup))

    if (latLngs.length >= 3) {
      L.polygon(latLngs, { color: '#1F4E79', weight: 2, fillColor: '#1F4E79', fillOpacity: 0.2 }).addTo(layerGroup)
    } else if (latLngs.length === 2) {
      L.polyline(latLngs, { color: '#1F4E79', weight: 2 }).addTo(layerGroup)
    }
  }, [points])

  function removePoint(index: number) {
    onChange(points.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full h-[320px] rounded-lg border border-credential-hairline" />
      <p className="text-xs text-muted-foreground">
        Click the map to drop pins marking the incident's operating area, in order around its perimeter.
      </p>
      {points.length > 0 && (
        <ul className="flex flex-col gap-1">
          {points.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-credential-hairline px-2 py-1 text-sm"
            >
              <span>
                Point {i + 1}: {Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removePoint(i)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {points.length > 0 && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([])}>
          Clear Boundary
        </Button>
      )}
    </div>
  )
}
