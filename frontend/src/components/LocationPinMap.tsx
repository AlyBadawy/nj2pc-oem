import { useEffect, useRef } from 'react'
import L from 'leaflet'

type Props = {
  latitude: string
  longitude: string
  onChange: (latitude: string, longitude: string) => void
  className?: string
}

const DEFAULT_CENTER: L.LatLngExpression = [39.8283, -98.5795]
const RADIUS_FEET = 400
const FEET_TO_METERS = 0.3048
const METERS_PER_DEGREE_LAT = 111_320

function pinDivIcon(): L.DivIcon {
  return L.divIcon({
    className: 'location-pin-marker',
    html: `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7.05 11.34 7.35 11.6a1 1 0 0 0 1.3 0C12.95 21.34 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#C4432D" stroke="#F7F5F0" stroke-width="0.75"/></svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 27],
  })
}

/** Fits the view to a square roughly `RADIUS_FEET` on each side of the point — used both for the
 * initial "Capture My Location" zoom-in and whenever the pin moves from outside this component
 * (geolocation, manual coordinate entry). Degree-per-meter varies with latitude for longitude
 * (not latitude), so the longitude delta is corrected by cos(latitude). */
function fitToRadius(map: L.Map, lat: number, lng: number) {
  const metersRadius = RADIUS_FEET * FEET_TO_METERS
  const latDelta = metersRadius / METERS_PER_DEGREE_LAT
  const lngDelta = metersRadius / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
  map.fitBounds(L.latLngBounds([lat - latDelta, lng - lngDelta], [lat + latDelta, lng + lngDelta]))
}

/** Single-pin location picker: click anywhere to place/move the pin, or drag it directly to
 * correct its placement — both feed back through `onChange` the same way "Capture My Location"
 * does, so all three coordinate sources (geolocation, map, manual text inputs elsewhere on the
 * page) stay in sync through one shared `latitude`/`longitude` state in the parent. Only
 * re-centers/zooms when the coordinates change from *outside* this component (a fresh capture or
 * typed edit) — not on every drag, which would otherwise yank the view out from under the pin
 * mid-gesture. */
export function LocationPinMap({ latitude, longitude, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const skipNextRecenter = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const lat = Number(latitude)
    const lng = Number(longitude)
    const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng)

    const marker = L.marker(hasCoords ? [lat, lng] : DEFAULT_CENTER, { icon: pinDivIcon(), draggable: true })
    if (hasCoords) marker.addTo(map)
    markerRef.current = marker

    function placeAt(latlng: L.LatLng) {
      marker.setLatLng(latlng)
      if (!map.hasLayer(marker)) marker.addTo(map)
      skipNextRecenter.current = true
      onChange(String(latlng.lat), String(latlng.lng))
    }

    marker.on('dragend', () => placeAt(marker.getLatLng()))
    map.on('click', (e: L.LeafletMouseEvent) => placeAt(e.latlng))

    if (hasCoords) {
      fitToRadius(map, lat, lng)
    } else {
      map.setView(DEFAULT_CENTER, 4)
    }

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Initialized once; coordinate sync happens in the effect below via refs, and onChange reads
    // the latest callback through the closure captured at mount (parent passes a stable setter).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return

    marker.setLatLng([lat, lng])
    if (!map.hasLayer(marker)) marker.addTo(map)

    if (skipNextRecenter.current) {
      skipNextRecenter.current = false
      return
    }
    fitToRadius(map, lat, lng)
  }, [latitude, longitude])

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        className={className ?? 'w-full h-[300px] sm:h-[360px] rounded-lg border border-credential-hairline'}
      />
      <p className="text-xs text-muted-foreground">Click the map or drag the pin to fine-tune the exact spot.</p>
    </div>
  )
}
