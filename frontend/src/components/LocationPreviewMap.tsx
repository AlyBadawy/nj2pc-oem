import { useEffect, useRef } from 'react'
import L from 'leaflet'

type Props = {
  latitude: string | null
  longitude: string | null
  className?: string
}

const RADIUS_FEET = 400
const FEET_TO_METERS = 0.3048
const METERS_PER_DEGREE_LAT = 111_320

function pinDivIcon(): L.DivIcon {
  return L.divIcon({
    className: 'location-pin-marker',
    html: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7.05 11.34 7.35 11.6a1 1 0 0 0 1.3 0C12.95 21.34 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#C4432D" stroke="#F7F5F0" stroke-width="0.75"/></svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 23],
  })
}

/** Small, non-interactive read-only map for a single point — used on deployment location cards
 * where a full pin-picker would be overkill. Dragging/zooming/click are all disabled; it's a
 * snapshot, not a control. */
export function LocationPreviewMap({ latitude, longitude, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const lat = Number(latitude)
    const lng = Number(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return

    const map = L.map(container, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.marker([lat, lng], { icon: pinDivIcon(), interactive: false }).addTo(map)

    const metersRadius = RADIUS_FEET * FEET_TO_METERS
    const latDelta = metersRadius / METERS_PER_DEGREE_LAT
    const lngDelta = metersRadius / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
    map.fitBounds(L.latLngBounds([lat - latDelta, lng - lngDelta], [lat + latDelta, lng + lngDelta]))

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      map.remove()
    }
  }, [latitude, longitude])

  const hasCoords = latitude != null && longitude != null && !Number.isNaN(Number(latitude)) && !Number.isNaN(Number(longitude))

  if (!hasCoords) {
    return (
      <div className={className ?? 'w-full h-32 rounded-md border border-credential-hairline flex items-center justify-center'}>
        <span className="text-xs text-muted-foreground">No coordinates set</span>
      </div>
    )
  }

  return <div ref={containerRef} className={className ?? 'w-full h-32 rounded-md border border-credential-hairline'} />
}
