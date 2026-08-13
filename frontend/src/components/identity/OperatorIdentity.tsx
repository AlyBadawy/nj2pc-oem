import { cn } from '@/lib/utils'
import { roleTierFrom } from '@/lib/roleTier'
import { formatElapsed, type OperatorIdentityData } from '@/lib/identity'
import { RoleBadge } from '@/components/identity/RoleBadge'
import { ContactLine } from '@/components/identity/MaskedValue'
import { Barcode } from '@/components/identity/Barcode'

function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative flex items-end justify-center overflow-hidden', className)}
      style={{
        background: 'repeating-linear-gradient(135deg, #DFDCD3 0 6px, #EAE7DF 6px 12px)',
      }}
    >
      <span className="credential-micro pb-1 !text-black/38">Operator Photo</span>
    </div>
  )
}

function StatusDot({ active = true }: { active?: boolean }) {
  if (!active) {
    return <span className="inline-flex size-2.5 shrink-0 rounded-full bg-white/35" />
  }
  return (
    <span className="relative inline-flex size-2.5 shrink-0">
      <span
        className="absolute inline-flex size-full rounded-full opacity-60"
        style={{ background: 'var(--credential-blue-soft)', boxShadow: '0 0 0 3px rgba(127,178,229,.25)' }}
      />
      <span
        className="relative inline-flex size-full rounded-full"
        style={{ background: 'var(--credential-blue-soft)' }}
      />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Surface 1 — credential (operator detail page)
// ---------------------------------------------------------------------------

function CredentialCard({ data, orgName }: { data: OperatorIdentityData; orgName: string }) {
  const {
    callsign,
    name,
    licenseClass,
    role,
    roleColor,
    roleAccessLevel,
    phone,
    email,
    licensePlate,
    canViewContact,
    photoUrl,
    credentialNo,
    incident,
  } = data

  return (
    <div
      className="w-full max-w-[544px] overflow-hidden rounded-xl border border-black/[.12] bg-credential-paper font-credential-sans shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_-8px_rgba(0,0,0,.18)] print:shadow-none"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      <div className="h-[7px] bg-credential-blue" />

      <div className="flex items-start justify-between gap-3 border-b border-credential-hairline px-4 py-3">
        <div className="min-w-0">
          <div className="credential-narrow truncate text-[12px] font-semibold text-credential-blue">
            {orgName}
          </div>
          <div className="credential-micro mt-0.5">Emergency Communications — Operator Credential</div>
        </div>
        {credentialNo && (
          <div className="whitespace-nowrap text-right font-credential-mono text-[9px] text-black/55">
            {credentialNo}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[106px_1fr] gap-[18px] p-[18px]">
        <div className="min-w-0">
          <div className="h-[132px] w-[106px] overflow-hidden rounded-[3px] border border-credential-hairline">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <PhotoPlaceholder className="h-full w-full" />
            )}
          </div>
          <Barcode callsign={callsign} id={data.id} className="mt-1.5" />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="min-w-0">
            <div className="credential-micro">Callsign</div>
            <div className="truncate font-credential-mono text-[48px] font-extrabold leading-[.86] tracking-[-.03em]">
              {callsign}
            </div>
            <div className="truncate text-[21px] font-semibold">{name}</div>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-credential-hairline pt-2.5">
            <div className="min-w-0">
              <div className="credential-micro">License Class</div>
              <div className="text-[14px]">{licenseClass || '—'}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="credential-micro mb-1">Access Role</div>
              <RoleBadge role={role} roleColor={roleColor} roleAccessLevel={roleAccessLevel} variant="band" />
            </div>
          </div>

          <div className="flex gap-6">
            <ContactLine kind="phone" value={phone} canView={canViewContact} />
            <ContactLine kind="email" value={email} canView={canViewContact} />
          </div>

          <ContactLine
            kind="plate"
            value={licensePlate ?? null}
            canView={canViewContact}
            emptyText="NONE"
          />
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 text-white"
        style={{ background: incident ? 'var(--credential-ink)' : 'var(--credential-offline)' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot active={!!incident} />
          <div className="min-w-0">
            <div className="credential-micro !text-white/50">
              {incident ? 'Checked In — Active Incident' : 'Status'}
            </div>
            {incident ? (
              <div className="truncate text-[13.5px] font-semibold">
                {incident.name} · {incident.ref}
              </div>
            ) : (
              <div className="text-[13.5px] font-semibold text-white/75">Not checked in</div>
            )}
          </div>
        </div>
        {incident && data.checkedInAt && (
          <div className="whitespace-nowrap font-credential-mono text-[11px] text-white/85">
            {formatElapsed(data.checkedInAt)} on duty
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Surface 2 — row (roster table)
// ---------------------------------------------------------------------------

export function RosterHeader() {
  return (
    <div className="grid grid-cols-[1fr_88px_104px_72px] gap-2 bg-credential-ink px-3 py-2">
      {['Operator', 'Class', 'Role', 'Status'].map((label) => (
        <div key={label} className="font-credential-mono text-[8px] uppercase tracking-[.14em] text-white/50">
          {label}
        </div>
      ))}
    </div>
  )
}

function RosterRow({
  data,
  expanded,
  onToggle,
}: {
  data: OperatorIdentityData
  expanded: boolean
  onToggle: () => void
}) {
  const {
    callsign,
    name,
    licenseClass,
    role,
    roleColor,
    roleAccessLevel,
    phone,
    email,
    canViewContact,
    photoUrl,
    incident,
  } = data
  const onAir = !!incident

  return (
    <div className="border-b border-black/10">
      <div
        role="row"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={cn(
          'grid cursor-pointer grid-cols-[1fr_88px_104px_72px] items-center gap-2 px-3 py-2.5 outline-none',
          expanded && 'bg-credential-blue-tint',
        )}
        style={expanded ? { boxShadow: 'inset 3px 0 0 var(--credential-blue)' } : undefined}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-credential-mono text-[14px] font-bold">{callsign}</span>
          <span className="truncate text-[12px] text-black/62">{name}</span>
        </div>
        <div className="truncate text-[13px]">{licenseClass || '—'}</div>
        <div>
          <RoleBadge role={role} roleColor={roleColor} roleAccessLevel={roleAccessLevel} variant="chip" />
        </div>
        <div
          className="justify-self-end font-credential-mono text-[9px] uppercase tracking-[.1em]"
          style={{ color: onAir ? 'var(--credential-blue)' : 'rgba(0,0,0,.32)' }}
        >
          {onAir ? 'On Air' : 'Off'}
        </div>
      </div>

      {expanded && (
        <div
          className="grid grid-cols-[80px_1fr] gap-4 border-t border-dashed border-black/20 bg-credential-blue-tint px-3 py-3"
          style={{ boxShadow: 'inset 3px 0 0 var(--credential-blue)' }}
        >
          <div className="h-[98px] w-[80px] overflow-hidden rounded-[3px] border border-credential-hairline">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <PhotoPlaceholder className="h-full w-full" />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="credential-micro mb-1">Access Role</div>
                <RoleBadge role={role} roleColor={roleColor} roleAccessLevel={roleAccessLevel} variant="band" />
              </div>
              <ContactLine kind="phone" value={phone} canView={canViewContact} />
              <ContactLine kind="email" value={email} canView={canViewContact} />
            </div>
            {incident && (
              <div className="flex w-fit items-center gap-2 rounded-[3px] bg-credential-ink px-2.5 py-1.5 text-white">
                <StatusDot />
                <span className="credential-micro !text-white/55">Checked In</span>
                <span className="text-[12px] font-medium">{incident.name}</span>
                {data.checkedInAt && (
                  <span className="font-credential-mono text-[10px] text-white/80">
                    {formatElapsed(data.checkedInAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Surface 3 — tile (checked-in operator board)
// ---------------------------------------------------------------------------

function OperatorTile({ data, onClick }: { data: OperatorIdentityData; onClick?: () => void }) {
  const { callsign, name, licenseClass, role, assignment, checkedInAt } = data
  const info = roleTierFrom(role, data.roleColor, data.roleAccessLevel)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className="flex min-w-[206px] cursor-pointer flex-col overflow-hidden rounded-md border border-black/[.12] bg-credential-paper outline-none transition-shadow hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,.18)]"
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5" style={{ background: info.band }}>
        <span className="credential-narrow truncate text-[10px] font-semibold" style={{ color: info.labelColor }}>
          {info.label}
        </span>
        <span
          className="shrink-0 rounded-[2px] bg-credential-ink px-1 py-0.5 font-credential-mono text-[10px] font-bold"
          style={{ color: info.tier === 'L1' ? 'rgba(255,255,255,.75)' : info.band }}
        >
          {info.tier}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <div className="truncate font-credential-mono text-[22px] font-extrabold leading-none">{callsign}</div>
        <div className="truncate text-[13px]">{name}</div>
        <div className="credential-micro">{licenseClass || '—'}</div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-credential-hairline px-3 py-1.5">
        <span className="truncate text-[11.5px] text-black/70">{assignment || '—'}</span>
        {checkedInAt && (
          <span className="whitespace-nowrap font-credential-mono text-[11px] text-credential-blue">
            {formatElapsed(checkedInAt)}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export type OperatorIdentityProps =
  | { variant: 'credential'; data: OperatorIdentityData; orgName?: string }
  | { variant: 'row'; data: OperatorIdentityData; expanded: boolean; onToggle: () => void }
  | { variant: 'tile'; data: OperatorIdentityData; onClick?: () => void }

export function OperatorIdentity(props: OperatorIdentityProps) {
  if (props.variant === 'credential') {
    return <CredentialCard data={props.data} orgName={props.orgName ?? 'AuxComms by AL0Y'} />
  }
  if (props.variant === 'row') {
    return <RosterRow data={props.data} expanded={props.expanded} onToggle={props.onToggle} />
  }
  return <OperatorTile data={props.data} onClick={props.onClick} />
}
