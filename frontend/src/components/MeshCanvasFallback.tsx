import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { IncidentBoundaryPoint, MeshLinkSnapshot, MeshNodeSnapshot } from '@/lib/types'
import { drawMeshCanvas } from '@/lib/meshCanvasDraw'

type Props = {
  nodes: (MeshNodeSnapshot & { offSite?: boolean })[]
  links: MeshLinkSnapshot[]
  boundaryPoints?: IncidentBoundaryPoint[] | null
  className?: string
}

/** Offline-safe map fallback: no basemap imagery, just a lat/lng grid with a distance scale —
 * always renders, even fully mesh-isolated with no path to the internet. Redraws at whatever
 * size its container is (via ResizeObserver), so it also works correctly in fullscreen. The
 * actual drawing logic lives in `drawMeshCanvas` (shared with the mesh-scan PDF export). Forwards
 * its canvas element so `MeshMap` can grab a snapshot of it directly (already an exact match for
 * what's on screen — no separate re-render needed for PDF export). */
export const MeshCanvasFallback = forwardRef<HTMLCanvasElement, Props>(function MeshCanvasFallback(
  { nodes, links, boundaryPoints, className },
  forwardedRef,
) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useImperativeHandle(forwardedRef, () => canvasRef.current as HTMLCanvasElement)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    function draw() {
      if (!wrapper || !canvas) return
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(rect.width, 200)
      const height = Math.max(rect.height, 200)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      ctx.fillStyle = '#F7F5F0'
      ctx.fillRect(0, 0, width, height)

      drawMeshCanvas(ctx, width, height, { nodes, links, boundaryPoints })
    }

    draw()
    const observer = new ResizeObserver(() => draw())
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [nodes, links, boundaryPoints])

  return (
    <div ref={wrapperRef} className={className ?? 'w-full h-[420px]'}>
      <canvas ref={canvasRef} className="rounded-lg border border-credential-hairline bg-credential-paper" />
    </div>
  )
})
