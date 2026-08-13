import { roleTierFrom } from '@/lib/roleTier'
import { cn } from '@/lib/utils'

/**
 * `band` — full label + tier chip, band-colored across the whole element (credential card,
 * tile top band, expanded row detail). Only ever amber for L3, per the hard rule that amber
 * means access role and nothing else.
 * `chip` — compact roster-row form. Only L3 is filled/colored; L1/L2 render as outlined
 * neutral chips so an amber Net Control entry is the only thing that visually pops.
 */
export function RoleBadge({
  role,
  roleColor,
  roleAccessLevel,
  variant,
}: {
  role: string | null
  roleColor?: string | null
  roleAccessLevel?: string | null
  variant: 'band' | 'chip'
}) {
  const info = roleTierFrom(role, roleColor, roleAccessLevel)

  if (variant === 'chip') {
    const filled = info.tier !== 'UNASSIGNED'
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-credential-mono text-[10px] uppercase tracking-[.08em]',
          filled ? 'text-credential-ink' : 'border border-black/22 text-black/60',
        )}
        style={filled ? { background: info.band } : undefined}
      >
        {info.shortLabel} · {info.tier}
      </span>
    )
  }

  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-[3px]" style={{ background: info.band }}>
      <span
        className="credential-narrow px-2 py-1 text-[11px] font-semibold"
        style={{ color: info.labelColor }}
      >
        {info.label}
      </span>
      <span
        className="flex items-center bg-credential-ink px-1.5 font-credential-mono text-[11px] font-bold"
        style={{ color: info.tier === 'L1' ? 'rgba(255,255,255,.75)' : info.band }}
      >
        {info.tier}
      </span>
    </span>
  )
}
