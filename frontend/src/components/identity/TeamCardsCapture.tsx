import { forwardRef, useImperativeHandle, useRef } from 'react'
import { domToPng } from 'modern-screenshot'
import { OperatorIdentity } from '@/components/identity/OperatorIdentity'
import type { OperatorIdentityData } from '@/lib/identity'

export type TeamCardsCaptureHandle = {
  /** Rasterizes each page's worth of cards (up to 8 — 4 columns x 2 rows) as its own PNG data
   * URL, in page order, ready to embed one-per-PDF-page server-side. Async because the browser
   * may still be laying out/loading operator photos even though the container itself is already
   * mounted. */
  capturePages: () => Promise<string[]>
}

const CARD_WIDTH = 220
const GAP = 24
const COLUMNS = 4
const ROWS_PER_PAGE = 2
const CARDS_PER_PAGE = COLUMNS * ROWS_PER_PAGE
const PAGE_BACKGROUND = '#F1EFEA' // --credential-paper-edge

/** Renders the exact same `CredentialCardCompact` cards the Team page shows on screen into an
 * off-screen (not display:none — the capture needs real layout/paint) container, chunked 8 per
 * page (4 cols x 2 rows), so the PDF can embed a client-captured image of the real component
 * instead of a hand-rebuilt server-side approximation — mirrors how the incident map page is
 * already captured client-side (frontend/src/lib/meshMapCapture.ts) rather than redrawn in Java. */
export const TeamCardsCapture = forwardRef<TeamCardsCaptureHandle, { team: OperatorIdentityData[]; orgName?: string }>(
  ({ team, orgName }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const pages: OperatorIdentityData[][] = []
    for (let i = 0; i < team.length; i += CARDS_PER_PAGE) {
      pages.push(team.slice(i, i + CARDS_PER_PAGE))
    }

    useImperativeHandle(ref, () => ({
      async capturePages() {
        const host = containerRef.current
        if (!host) return []
        const pageEls = Array.from(host.querySelectorAll<HTMLElement>('[data-team-cards-page]'))
        const images: string[] = []
        for (const el of pageEls) {
          images.push(await domToPng(el, { scale: 2, backgroundColor: PAGE_BACKGROUND }))
        }
        return images
      },
    }))

    if (pages.length === 0) return null

    return (
      <div ref={containerRef} className="pointer-events-none fixed top-0 left-[-10000px]" aria-hidden>
        {pages.map((pageTeam, i) => (
          <div
            key={i}
            data-team-cards-page
            style={{
              width: COLUMNS * CARD_WIDTH + (COLUMNS - 1) * GAP + GAP * 2,
              display: 'grid',
              gridTemplateColumns: `repeat(${COLUMNS}, ${CARD_WIDTH}px)`,
              gap: GAP,
              padding: GAP,
              background: PAGE_BACKGROUND,
            }}
          >
            {pageTeam.map((t) => (
              <OperatorIdentity key={t.id} variant="credential-compact" data={t} orgName={orgName} />
            ))}
          </div>
        ))}
      </div>
    )
  },
)
TeamCardsCapture.displayName = 'TeamCardsCapture'
