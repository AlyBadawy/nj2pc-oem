import type { MeshLinkType } from '@/lib/types'

/**
 * Visual encoding for mesh links, color-only (no dash/line-style — that visibly lost its
 * pattern at some zoom levels on real devices, an SVG rendering inconsistency not reproducible
 * in every browser, so color-only is the reliable choice across zoom levels and renderers).
 *
 * RF links are colored by CHANNEL — the actionable RF-planning detail (two links sharing a
 * channel is a real co-channel-interference signal, worth seeing at a glance; "5GHz" alone
 * doesn't tell you that). Channel values are arbitrary strings set by whoever configured the
 * node, not a small fixed set, so there's no fixed lookup table — colors are derived
 * deterministically from the channel string itself (same channel always renders the same
 * color, stable across renders/sessions, no legend maintenance needed as new channels appear).
 * DtD/Tunnel/Unknown links don't have a channel at all, so they keep a fixed color per type.
 */

export const LINK_TYPE_LABEL: Record<MeshLinkType, string> = {
  RF: 'RF',
  DTD: 'Direct (DtD)',
  TUNNEL: 'Tunnel',
  UNKNOWN: 'Unknown',
}

export const LINK_TYPE_COLOR: Record<MeshLinkType, string> = {
  RF: '#1D7E5C',
  DTD: '#2E6CA4',
  TUNNEL: '#9C6B12',
  UNKNOWN: '#8A8A8A',
}

/** Deterministic hash of a string to [0, 360) — used as a hue so the same channel always gets
 * the same color, without needing to know the set of channels in advance. */
function hashHue(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

export function channelColor(channel: string): string {
  return `hsl(${hashHue(channel)}, 65%, 38%)`
}

export function linkColor(linkType: MeshLinkType, channel: string | null): string {
  if (linkType === 'RF' && channel) return channelColor(channel)
  return LINK_TYPE_COLOR[linkType]
}
