import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskEmail, maskPhone } from '@/lib/identity'

/** Contact value: masked by default for a permitted viewer, full value on hover/focus/tap.
 * The permission check itself already happened server-side (unmasked values are never sent
 * to a viewer without OPERATOR_VIEW_CONTACT) — this only controls presentation. */
export function MaskedValue({ kind, value }: { kind: 'phone' | 'email'; value: string }) {
  const [revealed, setRevealed] = useState(false)
  const display = revealed ? value : kind === 'phone' ? maskPhone(value) : maskEmail(value)
  const label = kind === 'phone' ? 'Phone' : 'Email'

  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={`${label}, hidden. Reveal.`}
      className={cn(
        'font-credential-mono text-[13px] cursor-default border-b border-dashed pb-px transition-colors duration-[120ms] outline-none',
        revealed ? 'text-credential-blue border-credential-blue' : 'text-credential-ink border-black/30',
      )}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      onClick={(e) => {
        e.stopPropagation()
        setRevealed((r) => !r)
      }}
    >
      {display}
    </span>
  )
}

export function RestrictedValue() {
  return <span className="font-credential-mono text-[13px] text-black/35">— restricted —</span>
}

function NotOnFile() {
  return <span className="font-credential-mono text-[13px] text-black/35">—</span>
}

export function ContactLine({
  kind,
  value,
  canView,
}: {
  kind: 'phone' | 'email'
  value: string | null
  canView: boolean
}) {
  const label = kind === 'phone' ? 'Phone' : 'Email'
  return (
    <div>
      <div className="credential-micro flex items-center gap-1">
        <Lock className="size-2.5" aria-hidden />
        {label}
      </div>
      {!canView ? <RestrictedValue /> : value ? <MaskedValue kind={kind} value={value} /> : <NotOnFile />}
    </div>
  )
}
