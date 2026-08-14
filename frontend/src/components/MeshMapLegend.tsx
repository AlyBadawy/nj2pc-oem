import { BAND_LEGEND, LINK_TYPE_COLOR_FALLBACK, LINK_TYPE_DASH, LINK_TYPE_LABEL } from '@/lib/meshVisual'
import type { MeshLinkType } from '@/lib/types'

function DashSwatch({ type }: { type: MeshLinkType }) {
  const dash = LINK_TYPE_DASH[type]
  return (
    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden>
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={LINK_TYPE_COLOR_FALLBACK[type]}
        strokeWidth="2.5"
        strokeDasharray={dash.length ? dash.join(',') : undefined}
      />
    </svg>
  )
}

export function MeshMapLegend() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Link Type (line style)</p>
        <div className="flex flex-col gap-1">
          {(Object.keys(LINK_TYPE_LABEL) as MeshLinkType[]).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <DashSwatch type={type} />
              <span>{LINK_TYPE_LABEL[type]}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Band (RF link color)</p>
        <div className="flex flex-col gap-1">
          {BAND_LEGEND.map(([band, color]) => (
            <div key={band} className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
              <span>{band}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-2.5 rounded-full border-2 border-credential-blue-deep bg-credential-blue-deep" />
        <span>Local node (scanned from)</span>
      </div>
    </div>
  )
}
