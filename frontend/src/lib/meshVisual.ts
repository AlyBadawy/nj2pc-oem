import type { MeshLinkType } from '@/lib/types'

/**
 * Visual encoding for mesh links: link TYPE (RF/DtD/Tunnel) maps to line style — the
 * safety-relevant distinction (a tunnel crosses non-mesh infrastructure), legible at any zoom
 * with no color needed, so it also works in the offline canvas fallback. Link BAND maps to
 * color — an engineering-level detail, rewarding closer inspection. Keep these two dimensions
 * independent so they never collide.
 */

export const LINK_TYPE_LABEL: Record<MeshLinkType, string> = {
  RF: 'RF',
  DTD: 'Direct (DtD)',
  TUNNEL: 'Tunnel',
  UNKNOWN: 'Unknown',
}

/** Canvas/SVG dash pattern per link type. Empty array = solid line. */
export const LINK_TYPE_DASH: Record<MeshLinkType, number[]> = {
  RF: [],
  DTD: [6, 4],
  TUNNEL: [2, 5],
  UNKNOWN: [1, 5],
}

export const LINK_TYPE_COLOR_FALLBACK: Record<MeshLinkType, string> = {
  RF: '#1D7E5C',
  DTD: '#2E6CA4',
  TUNNEL: '#9C6B12',
  UNKNOWN: '#8A8A8A',
}

const BAND_COLORS: Record<string, string> = {
  '900MHz': '#C4432D',
  '2.3GHz': '#E8A324',
  '3GHz': '#2E6CA4',
  '5GHz': '#1D7E5C',
}

const DEFAULT_BAND_COLOR = '#8A8A8A'

export function bandColor(band: string | null): string {
  if (!band) return DEFAULT_BAND_COLOR
  return BAND_COLORS[band] ?? DEFAULT_BAND_COLOR
}

export const BAND_LEGEND = Object.entries(BAND_COLORS)

/**
 * A link's band is only knowable when it's the local node's own RF radio (one-hop scrape never
 * learns a neighbor's band independently) — so RF links are colored by the local node's band,
 * and DtD/Tunnel links (band doesn't meaningfully apply to them) get a fixed type color instead.
 */
export function linkColor(linkType: MeshLinkType, localNodeBand: string | null): string {
  if (linkType === 'RF') return bandColor(localNodeBand)
  return LINK_TYPE_COLOR_FALLBACK[linkType]
}
