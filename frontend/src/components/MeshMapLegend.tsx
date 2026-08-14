import { LINK_TYPE_COLOR, LINK_TYPE_LABEL } from '@/lib/meshVisual'

export function MeshMapLegend() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Link Color</p>
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: LINK_TYPE_COLOR.RF }} />
          <span>RF — colored by channel</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Two links sharing a color share a channel. Tap or hover a link for the exact channel/band.
        </p>
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: LINK_TYPE_COLOR.DTD }} />
            <span>{LINK_TYPE_LABEL.DTD}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: LINK_TYPE_COLOR.TUNNEL }} />
            <span>{LINK_TYPE_LABEL.TUNNEL}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: LINK_TYPE_COLOR.UNKNOWN }} />
            <span>{LINK_TYPE_LABEL.UNKNOWN}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-2.5 rounded-full border-2 border-credential-blue-deep bg-credential-blue-deep" />
        <span>Local node (scanned from)</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: '#B9B3A6', border: '2px dashed #1F4E79' }}
          />
          <span>Off-site (not physically at the incident)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Its links are also faded, but keep their normal color.</p>
      </div>
    </div>
  )
}
