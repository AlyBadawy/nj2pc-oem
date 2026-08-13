import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskEmail, maskPhone, maskPlate } from '@/lib/identity'

type MaskedKind = 'phone' | 'email' | 'plate'

const KIND_LABEL: Record<MaskedKind, string> = {
  phone: 'Phone',
  email: 'Email',
  plate: 'License Plate',
}

const KIND_MASK: Record<MaskedKind, (raw: string) => string> = {
  phone: maskPhone,
  email: maskEmail,
  plate: maskPlate,
}

/** Contact value: masked by default for a permitted viewer, full value on hover/focus/tap.
 * The permission check itself already happened server-side (unmasked values are never sent
 * to a viewer without OPERATOR_VIEW_CONTACT) — this only controls presentation. */
export function MaskedValue({ kind, value }: { kind: MaskedKind; value: string }) {
  const [revealed, setRevealed] = useState(false)
  const display = revealed ? value : KIND_MASK[kind](value)
  const label = KIND_LABEL[kind]

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

function NotOnFile({ text = '—' }: { text?: string }) {
  return <span className="font-credential-mono text-[13px] text-black/35">{text}</span>
}

export function ContactLine({
  kind,
  value,
  canView,
  emptyText,
}: {
  kind: MaskedKind
  value: string | null
  canView: boolean
  emptyText?: string
}) {
  const label = KIND_LABEL[kind]
  return (
    <div>
      <div className="credential-micro flex items-center gap-1">
        <Lock className="size-2.5" aria-hidden />
        {label}
      </div>
      {!canView ? (
        <RestrictedValue />
      ) : value ? (
        <MaskedValue kind={kind} value={value} />
      ) : (
        <NotOnFile text={emptyText} />
      )}
    </div>
  )
}
