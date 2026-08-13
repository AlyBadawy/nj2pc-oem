export interface RoleTierInfo {
  tier: string
  label: string
  shortLabel: string
  band: string
  labelColor: string
}

const UNASSIGNED: RoleTierInfo = {
  tier: 'UNASSIGNED',
  label: 'Unassigned',
  shortLabel: 'Unassigned',
  band: 'var(--credential-neutral-band)',
  labelColor: 'rgba(0,0,0,.42)',
}

/** Builds tier/band/label styling from a role's own data (name + admin-configured color/access
 * level) instead of a hardcoded lookup — every credential surface reads from this. */
export function roleTierFrom(
  roleName: string | null | undefined,
  roleColor: string | null | undefined,
  roleAccessLevel: string | null | undefined,
): RoleTierInfo {
  if (!roleName || !roleColor || !roleAccessLevel) return UNASSIGNED
  return {
    tier: roleAccessLevel,
    label: roleName,
    shortLabel: roleName,
    band: roleColor,
    labelColor: 'var(--credential-ink)',
  }
}

const parseLevel = (accessLevel: string | null | undefined): number => {
  const match = /\d+/.exec(accessLevel ?? '')
  return match ? Number(match[0]) : 0
}

export function tierRank(roleAccessLevel: string | null | undefined): number {
  return parseLevel(roleAccessLevel)
}
