import { api } from '@/lib/api'
import type { MeshLinkType } from '@/lib/types'

/**
 * Client-side scraper for AREDN node status pages. Runs entirely in the browser — AREDN nodes
 * send `Access-Control-Allow-Origin: *` on every relevant endpoint (confirmed live), so this
 * works from whatever device the operator is using while actually connected to the mesh. Never
 * routed through the app's own backend (`@/lib/api`) for the node/link crawl itself — these are
 * separate `.local.mesh` origins. The one deliberate exception is the LAN ping-sweep at the end:
 * browsers have no ICMP capability, so that one step calls our own backend instead, which can
 * actually ping.
 */

export type MeshNodeInput = {
  hostname: string
  isLocalNode: boolean
  macAddress: string | null
  meshIpAddress: string | null
  linkLocalAddress: string | null
  model: string | null
  firmwareVersion: string | null
  latitude: string | null
  longitude: string | null
  claimedDistanceMi: string | null
  channel: string | null
  band: string | null
  frequencyMhz: string | null
  channelWidth: string | null
  rfPowerDbm: string | null
  rawJson: Record<string, unknown> | null
}

export type MeshLinkInput = {
  fromHostname: string
  toHostname: string
  toMacAddress: string | null
  sourceSection: 'LOCAL_NODES' | 'NEIGHBORHOOD_NODES'
  linkTypeNormalized: MeshLinkType
  rawLinkType: string | null
  linkQualityStatus: string | null
  rxPercent: string | null
  rttMs: string | null
  snr: string | null
  nSnr: string | null
  errorsPercent: string | null
  mbps: string | null
  distanceMiles: string | null
  rxSuccessPercent: string | null
  txSuccessPercent: string | null
  rxCost: string | null
  txCost: string | null
  pingTimeMs: string | null
  pingSuccessPercent: string | null
  avgTx: string | null
  rawJson: Record<string, unknown> | null
}

export type MeshLanClientInput = {
  nodeHostname: string
  deviceHostname: string
  deviceUrl: string | null
}

export type MeshScrapeResult = {
  localNodeHostname: string
  nodes: MeshNodeInput[]
  links: MeshLinkInput[]
  lanClients: MeshLanClientInput[]
}

export type MeshScrapeProgress = (message: string) => void

type NeighborRowRaw = {
  hostname: string
  mac: string | null
  section: 'LOCAL_NODES' | 'NEIGHBORHOOD_NODES'
  qualityStatus: string | null
  rxPercent: string | null
  rttMs: string | null
  snr: string | null
  nSnr: string | null
  errorsPercent: string | null
  mbps: string | null
  distanceMiles: string | null
}

class MeshFetchError extends Error {
  kind: 'not-on-mesh' | 'fetch-failed' | 'mixed-content'
  constructor(kind: 'not-on-mesh' | 'fetch-failed' | 'mixed-content', message: string) {
    super(message)
    this.kind = kind
  }
}

async function fetchText(url: string, timeoutMs = 9000): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal })
    if (!response.ok) {
      throw new MeshFetchError('fetch-failed', `${url} responded with ${response.status}`)
    }
    return await response.text()
  } catch (err) {
    if (err instanceof MeshFetchError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new MeshFetchError('not-on-mesh', 'Timed out reaching the mesh — is this device connected to it?')
    }
    throw new MeshFetchError('not-on-mesh', 'Could not reach the mesh — is this device connected to it?')
  } finally {
    clearTimeout(timeout)
  }
}

function textOf(el: Element | null | undefined): string | null {
  const text = el?.textContent?.trim()
  return text ? text : null
}

/** Finds the `.section` element immediately following a `.section-title` div with the given text. */
function findSection(doc: Document, titleText: string): Element | null {
  const titles = Array.from(doc.querySelectorAll('.section-title'))
  const title = titles.find((t) => t.textContent?.trim() === titleText)
  if (!title) return null
  let sibling = title.nextElementSibling
  while (sibling && !sibling.classList.contains('section')) {
    sibling = sibling.nextElementSibling
  }
  return sibling ?? null
}

/** Reads a `<div class="t">value</div><div class="s">label</div>` pair group by label text. */
function readLabeledValue(root: Element, labelText: string): string | null {
  const labels = Array.from(root.querySelectorAll('.s'))
  const label = labels.find((l) => l.textContent?.trim().toLowerCase() === labelText.toLowerCase())
  const valueEl = label?.previousElementSibling
  return textOf(valueEl)
}

function macFromHxGet(hxGet: string | null): string | null {
  if (!hxGet) return null
  const match = /[?&]m=([^&]+)/.exec(hxGet)
  return match ? decodeURIComponent(match[1]) : null
}

function parseNeighborRows(section: Element | null, sourceSection: 'LOCAL_NODES' | 'NEIGHBORHOOD_NODES'): NeighborRowRaw[] {
  if (!section) return []
  const rows = Array.from(section.querySelectorAll('[hx-get^="neighbor-device"]'))
  return rows.map((row) => {
    const anchor = row.querySelector('.h a')
    const stats = Array.from(row.querySelectorAll('.ts.cols.stats > div')).map((d) => textOf(d))
    return {
      hostname: textOf(anchor) ?? '',
      mac: macFromHxGet(row.getAttribute('hx-get')),
      section: sourceSection,
      qualityStatus: row.className.match(/status\s+(\S+)/)?.[1] ?? null,
      rxPercent: stats[0] ?? null,
      rttMs: stats[1] ?? null,
      snr: stats[2] ?? null,
      nSnr: stats[3] ?? null,
      errorsPercent: stats[4] ?? null,
      mbps: stats[5] ?? null,
      distanceMiles: stats[6] ?? null,
    }
  }).filter((r) => r.hostname)
}

/** Rough band label from a frequency string like "5665 - 5685 MHz" — approximate, informational only. */
function inferBand(frequencyMhz: string | null): string | null {
  if (!frequencyMhz) return null
  const match = /(\d+(?:\.\d+)?)/.exec(frequencyMhz)
  if (!match) return null
  const mhz = Number(match[1])
  if (mhz < 1000) return '900MHz'
  if (mhz < 3000) return '2.3GHz'
  if (mhz < 4000) return '3GHz'
  return '5GHz'
}

type LocalStatusParsed = {
  model: string | null
  firmwareVersion: string | null
  latitude: string | null
  longitude: string | null
  channel: string | null
  frequencyMhz: string | null
  channelWidth: string | null
  localDevices: MeshLanClientInput[]
  neighborRows: NeighborRowRaw[]
  lanRangeIps: string[]
}

/** The node's own `#location` block is a standalone div (not a `.section-title`/`.section`
 * pair like everything else), holding a single "lat, lng" text pair, e.g. "40.96522, -74.24028". */
function parseOwnLocation(doc: Document): { latitude: string | null; longitude: string | null } {
  const text = textOf(doc.querySelector('#location .t'))
  if (!text) return { latitude: null, longitude: null }
  const [lat, lng] = text.split(',').map((s) => s.trim())
  // A node with no GPS configured renders literal placeholder text here (e.g. "Unknown") rather
  // than omitting the block — only accept values that actually look like decimal coordinates.
  const isCoordinate = (value: string | undefined): value is string => !!value && /^-?\d+(\.\d+)?$/.test(value)
  return {
    latitude: isCoordinate(lat) ? lat : null,
    longitude: isCoordinate(lng) ? lng : null,
  }
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

const IP_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/** Expands an inclusive "start - end" range into individual addresses. Capped at 32 — a mesh
 * LAN's DHCP range is always small (a /29 has 5 usable addresses; even a /24 would be unusual
 * for a node's own LAN) — this is a sanity guard against a malformed range, not a real ceiling. */
function expandIpRange(start: string, end: string): string[] {
  if (!IP_PATTERN.test(start) || !IP_PATTERN.test(end)) return []
  const s = ipToInt(start)
  const e = ipToInt(end)
  if (e < s || e - s > 32) return []
  const ips: string[] = []
  for (let i = s; i <= e; i++) ips.push(intToIp(i))
  return ips
}

/** AREDN's own "LAN DHCP" section already computes and displays the usable host range for the
 * node's LAN subnet (e.g. gateway "10.6.229.9 / 29" → range "10.6.229.10 - 10.6.229.14") —
 * parsing that text directly avoids re-deriving CIDR math ourselves. Returns an empty list if
 * DHCP isn't active/present on this node (nothing to sweep). */
function parseLanDhcpRange(doc: Document): string[] {
  const dhcpSection = findSection(doc, 'LAN DHCP')
  if (!dhcpSection) return []
  const status = readLabeledValue(dhcpSection, 'status')
  if (!status || !/active/i.test(status)) return []
  const rangeText = readLabeledValue(dhcpSection, 'range')
  if (!rangeText) return []
  const [start, end] = rangeText.split('-').map((s) => s.trim())
  if (!start || !end) return []
  return expandIpRange(start, end)
}

function parseStatusPage(html: string, localHostname: string): LocalStatusParsed {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const radioSection = findSection(doc, 'Radio')
  const model = radioSection ? readLabeledValue(radioSection, 'model') : null

  // Firmware version lives in its own standalone `.firmware` block (not a `.section-title`/
  // `.section` pair like everything else), e.g. <div class="firmware"><div class="t">4.26.7.0
  // <div class="firmware-status .../></div><div class="s cols">...firmware version...</div></div>
  // — the version text itself sits alongside an empty status-icon div, so plain textContent
  // still comes back clean.
  const firmwareVersion = textOf(doc.querySelector('.firmware .t'))

  // Only "Mesh" counts as real mesh RF — "LAN Hotspot" is a local WiFi client network, not
  // part of mesh topology (same distinction already established when this app's gear inventory
  // was scraped node-by-node earlier).
  const meshSection = findSection(doc, 'Mesh')
  const channel = meshSection ? readLabeledValue(meshSection, 'channel') : null
  const frequencyMhz = meshSection ? readLabeledValue(meshSection, 'frequencies') : null
  const channelWidth = meshSection ? readLabeledValue(meshSection, 'bandwidth') : null

  const localDevicesSection = findSection(doc, 'Local Devices')
  const localDevices: MeshLanClientInput[] = localDevicesSection
    ? Array.from(localDevicesSection.querySelectorAll('.device a')).map((a) => ({
        nodeHostname: localHostname,
        deviceHostname: (a.textContent ?? '').replace(/\s+$/, '').trim(),
        deviceUrl: a.getAttribute('href'),
      })).filter((d) => d.deviceHostname)
    : []

  const localNodesSection = findSection(doc, 'Local Nodes')
  const neighborhoodSection = findSection(doc, 'Neighborhood Nodes')
  const neighborRows = [
    ...parseNeighborRows(localNodesSection, 'LOCAL_NODES'),
    ...parseNeighborRows(neighborhoodSection, 'NEIGHBORHOOD_NODES'),
  ]

  const { latitude, longitude } = parseOwnLocation(doc)
  const lanRangeIps = parseLanDhcpRange(doc)

  return {
    model,
    firmwareVersion,
    latitude,
    longitude,
    channel,
    frequencyMhz,
    channelWidth,
    localDevices,
    neighborRows,
    lanRangeIps,
  }
}

type NeighborDetailParsed = {
  type: string | null
  macAddress: string | null
  ipAddress: string | null
  model: string | null
  firmware: string | null
  linkAddress: string | null
  latitude: string | null
  longitude: string | null
  distance: string | null
  rxSuccess: string | null
  txSuccess: string | null
  rxCost: string | null
  txCost: string | null
  pingTime: string | null
  pingSuccess: string | null
  avgTx: string | null
}

function parseNeighborDetail(html: string): NeighborDetailParsed {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const map = new Map<string, string>()
  doc.querySelectorAll('.i').forEach((item) => {
    const divs = item.querySelectorAll('div')
    if (divs.length < 2) return
    const value = divs[0].textContent?.trim() ?? ''
    const label = divs[1].textContent?.trim().toLowerCase() ?? ''
    if (label) map.set(label, value)
  })
  return {
    type: map.get('type') ?? null,
    macAddress: map.get('mac address') ?? null,
    ipAddress: map.get('ip address') ?? null,
    model: map.get('model') ?? null,
    firmware: map.get('firmware') ?? null,
    linkAddress: map.get('link address') ?? null,
    latitude: map.get('latitude') ?? null,
    longitude: map.get('longitude') ?? null,
    distance: map.get('distance') ?? null,
    rxSuccess: map.get('rx success') ?? null,
    txSuccess: map.get('tx success') ?? null,
    rxCost: map.get('rx cost') ?? null,
    txCost: map.get('tx cost') ?? null,
    pingTime: map.get('ping time') ?? null,
    pingSuccess: map.get('ping success') ?? null,
    avgTx: map.get('avg tx') ?? null,
  }
}

/**
 * Best-effort classification, not confirmed against a real RF link sample (only two Tunnel
 * links were available when this was built — see project memory). DTD comes from which section
 * the row was found in; RF vs Tunnel is inferred from the neighbor-device detail's `type`
 * string. Revisit once a genuine RF-linked neighbor has been scraped.
 */
export function inferLinkType(section: 'LOCAL_NODES' | 'NEIGHBORHOOD_NODES', rawType: string | null): MeshLinkType {
  if (section === 'LOCAL_NODES') return 'DTD'
  if (!rawType) return 'UNKNOWN'
  if (/wireguard|tunnel/i.test(rawType)) return 'TUNNEL'
  return 'RF'
}

function nodeHostFromUrl(hostname: string): string {
  return `http://${hostname}.local.mesh`
}

/**
 * Extracts AREDN node hostnames from the `window.mesh = {hosts: {...}, ...}` blob embedded in
 * `/a/mesh-data`'s response — this is what lets a scan fan out beyond the local node's own
 * one-hop neighbor list. That blob is a raw JS object literal, not JSON (its keys are unquoted,
 * e.g. `{hosts:{...`), so it can't be `JSON.parse`d even after cleanup. Instead of a full parse,
 * this looks for the `["Name"]` single-element-array shape directly: per IP key, `hosts` holds
 * one `["NodeName"]` entry for the node itself followed by zero or more `["ClientName","ip"]`
 * entries for LAN clients attached to it — only the single-element form is an actual AREDN node.
 * A plain global regex for `["<string>"]` (quote immediately followed by `]`, no trailing
 * `,"...”`) picks out exactly those and nothing else — `services`' `{n:...,u:...}` entries and
 * `etx`'s `["ip",cost]` pairs never take that exact shape, so this is safe to run over the
 * whole blob without first isolating the `hosts` section.
 */
function extractMeshWideHostnames(html: string): string[] {
  const match = /window\.mesh\s*=\s*(\{[\s\S]*?\});/.exec(html)
  if (!match) return []
  const blob = match[1]
  const names = new Set<string>()
  const re = /\[\s*"([^"]+)"\s*\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(blob)) !== null) {
    names.add(m[1])
  }
  return Array.from(names)
}

type NodeScanResult = {
  node: MeshNodeInput
  links: MeshLinkInput[]
  lanClients: MeshLanClientInput[]
  lanRangeIps: string[]
}

/** Scans one node: its own status page (model/firmware/self RF config/neighbors/LAN clients),
 * plus a link-detail fetch per neighbor row, all served by this node itself. */
async function scanNode(hostname: string, isLocalNode: boolean): Promise<NodeScanResult> {
  const html = await fetchText(`${nodeHostFromUrl(hostname)}/a/status`)
  const parsed = parseStatusPage(html, hostname)

  const node: MeshNodeInput = {
    hostname,
    isLocalNode,
    macAddress: null,
    meshIpAddress: null,
    linkLocalAddress: null,
    model: parsed.model,
    firmwareVersion: parsed.firmwareVersion,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    claimedDistanceMi: null,
    channel: parsed.channel,
    band: inferBand(parsed.frequencyMhz),
    frequencyMhz: parsed.frequencyMhz,
    channelWidth: parsed.channelWidth,
    rfPowerDbm: null,
    rawJson: null,
  }

  const detailResults = await Promise.allSettled(
    parsed.neighborRows.map(async (row) => {
      if (!row.mac) return { row, detail: null }
      try {
        // AREDN's endpoint matches the `m=` MAC param as a raw literal string and does not
        // URL-decode it server-side — percent-encoding the colons (the "correct" way to build
        // a URL) breaks the lookup and silently returns an empty "not found" fragment instead
        // of an error. Send it exactly as AREDN's own markup does (unencoded).
        const detailHtml = await fetchText(`${nodeHostFromUrl(hostname)}/a/neighbor-device?m=${row.mac}`)
        return { row, detail: parseNeighborDetail(detailHtml) }
      } catch {
        return { row, detail: null }
      }
    }),
  )

  const links: MeshLinkInput[] = []
  for (const result of detailResults) {
    if (result.status !== 'fulfilled') continue
    const { row, detail } = result.value
    links.push({
      fromHostname: hostname,
      toHostname: row.hostname,
      toMacAddress: row.mac,
      sourceSection: row.section,
      linkTypeNormalized: inferLinkType(row.section, detail?.type ?? null),
      rawLinkType: detail?.type ?? null,
      linkQualityStatus: row.qualityStatus,
      rxPercent: row.rxPercent,
      rttMs: row.rttMs,
      snr: row.snr,
      nSnr: row.nSnr,
      errorsPercent: row.errorsPercent,
      mbps: row.mbps,
      distanceMiles: row.distanceMiles,
      rxSuccessPercent: detail?.rxSuccess ?? null,
      txSuccessPercent: detail?.txSuccess ?? null,
      rxCost: detail?.rxCost ?? null,
      txCost: detail?.txCost ?? null,
      pingTimeMs: detail?.pingTime ?? null,
      pingSuccessPercent: detail?.pingSuccess ?? null,
      avgTx: detail?.avgTx ?? null,
      rawJson: null,
    })
  }

  return { node, links, lanClients: parsed.localDevices, lanRangeIps: parsed.lanRangeIps }
}

export async function runMeshScrape(onProgress?: MeshScrapeProgress): Promise<MeshScrapeResult> {
  // AREDN nodes only ever serve plain HTTP — a page loaded over HTTPS (e.g. the internet-facing
  // domain) has every such fetch unconditionally blocked as mixed content, with no way around it
  // from JavaScript. Detect this upfront rather than waiting out a doomed timeout: if we're on
  // HTTPS, tell the user exactly what to do (switch to the plain-HTTP mesh address) instead of a
  // generic "not connected" message that doesn't explain why it will never work from here.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    throw new MeshFetchError(
      'mixed-content',
      'This page is loaded over HTTPS, which browsers block from reaching the mesh (plain HTTP only). Open this app at its mesh address instead, e.g. http://al0y-emcomms.local.mesh, then try scanning again.',
    )
  }

  onProgress?.('Connecting to localnode.local.mesh…')
  const statusUrl = 'http://localnode.local.mesh/a/status'
  let finalUrl = statusUrl
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)
    const response = await fetch(statusUrl, { redirect: 'follow', signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new MeshFetchError('fetch-failed', `Status page responded with ${response.status}`)
    finalUrl = response.url || statusUrl
  } catch (err) {
    if (err instanceof MeshFetchError) throw err
    throw new MeshFetchError('not-on-mesh', 'Could not reach the mesh — is this device connected to it?')
  }

  const localHostnameMatch = /https?:\/\/([^./]+)\.local\.mesh/i.exec(finalUrl)
  const localHostname = localHostnameMatch ? localHostnameMatch[1] : 'localnode'

  onProgress?.(`Connected to ${localHostname}. Discovering nodes on the mesh…`)
  let meshWideHostnames: string[] = []
  try {
    const meshDataHtml = await fetchText(`${nodeHostFromUrl(localHostname)}/a/mesh-data`)
    meshWideHostnames = extractMeshWideHostnames(meshDataHtml)
  } catch {
    // Fall back to a one-hop scan (just the local node) if the mesh-wide directory can't be
    // read — the local node's own status page still gets scanned below regardless.
  }

  const otherHostnames = meshWideHostnames.filter((h) => h.toLowerCase() !== localHostname.toLowerCase())
  const allTargets = [localHostname, ...otherHostnames]

  const nodesByHostname = new Map<string, MeshNodeInput>()
  const links: MeshLinkInput[] = []
  const lanClients: MeshLanClientInput[] = []

  onProgress?.(`Found ${allTargets.length} node(s) on the mesh. Scanning…`)
  let doneCount = 0
  const results = await Promise.allSettled(
    allTargets.map(async (hostname) => {
      const result = await scanNode(hostname, hostname.toLowerCase() === localHostname.toLowerCase())
      doneCount += 1
      onProgress?.(`Scanned ${doneCount}/${allTargets.length} node(s): ${hostname}`)
      return result
    }),
  )

  const lanSweepTargets: { nodeHostname: string; ips: string[] }[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const { node, links: nodeLinks, lanClients: nodeLanClients, lanRangeIps } = result.value
    nodesByHostname.set(node.hostname.toLowerCase(), node)
    links.push(...nodeLinks)
    lanClients.push(...nodeLanClients)
    if (lanRangeIps.length > 0) {
      lanSweepTargets.push({ nodeHostname: node.hostname, ips: lanRangeIps })
    }
  }

  // A device that's up but hasn't (or no longer) advertises itself under "Local Devices" would
  // otherwise never show up — this actively probes each node's LAN DHCP range for anything live,
  // in addition to whatever was already advertised. Runs against our own backend, not the mesh
  // node, since browsers can't send ICMP themselves — see the module comment up top.
  if (lanSweepTargets.length > 0) {
    onProgress?.('Checking for LAN devices…')
    try {
      const advertisedIps = new Set(
        lanClients.map((c) => c.deviceHostname.toLowerCase()).filter((h) => IP_PATTERN.test(h)),
      )
      const response = await api.post<{ results: { nodeHostname: string; ip: string }[] }>(
        '/api/mesh/lan-ping-sweep',
        { targets: lanSweepTargets },
      )
      for (const { nodeHostname, ip } of response.data.results) {
        if (advertisedIps.has(ip.toLowerCase())) continue
        lanClients.push({ nodeHostname, deviceHostname: ip, deviceUrl: `http://${ip}/` })
      }
    } catch {
      // A failed sweep shouldn't fail the whole scan — advertised LAN devices (already collected
      // above) and everything else still get submitted normally.
    }
  }

  // Every link endpoint should have a node entry, even if that node couldn't be scanned
  // directly (offline, unreachable, or not part of the mesh-wide directory at all) — otherwise
  // it'd be an orphaned reference with no row in the node list/map.
  for (const link of links) {
    for (const hostname of [link.fromHostname, link.toHostname]) {
      const key = hostname.toLowerCase()
      if (!nodesByHostname.has(key)) {
        nodesByHostname.set(key, {
          hostname,
          isLocalNode: false,
          macAddress: null,
          meshIpAddress: null,
          linkLocalAddress: null,
          model: null,
          firmwareVersion: null,
          latitude: null,
          longitude: null,
          claimedDistanceMi: null,
          channel: null,
          band: null,
          frequencyMhz: null,
          channelWidth: null,
          rfPowerDbm: null,
          rawJson: null,
        })
      }
    }
  }

  onProgress?.('Scan complete.')
  return { localNodeHostname: localHostname, nodes: Array.from(nodesByHostname.values()), links, lanClients }
}

export function isNotOnMeshError(err: unknown): boolean {
  return err instanceof MeshFetchError && err.kind === 'not-on-mesh'
}

export function isMixedContentError(err: unknown): boolean {
  return err instanceof MeshFetchError && err.kind === 'mixed-content'
}
