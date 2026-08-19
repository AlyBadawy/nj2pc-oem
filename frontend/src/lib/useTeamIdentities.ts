import { useMemo } from 'react'
import { hasPermission, type AuthUser } from '@/lib/auth-context'
import { apiUrl } from '@/lib/api'
import type { Incident, Operator, OperatorCheckIn } from '@/lib/types'
import { credentialNoFor, incidentRef, type OperatorIdentityData } from '@/lib/identity'

/** One credential card per operator who has ever checked in to this incident, keyed to their
 * most recent check-in — shared by the Team page (frontend/src/pages/IncidentOperators.tsx) and
 * the incident-wide "Generate PDF" dialog (frontend/src/pages/IncidentDetail.tsx), since both now
 * need the exact same card data to client-render/capture the same cards.
 *
 * The footer's `incident`/`checkedInAt` fields show a still-open check-in normally — but once
 * the incident itself is CLOSED, every check-in on it has necessarily been auto-checked-out (see
 * IncidentService.end()), so "still open" would always be empty and the footer would go blank.
 * For a closed incident we fall back to the operator's last check-in on it regardless of
 * checkedOutAt, so the card still shows where/when they were last deployed here. */
export function useTeamIdentities(
  operatorCheckIns: OperatorCheckIn[] | undefined,
  operators: Operator[] | undefined,
  incident: Incident | undefined,
  user: AuthUser | null | undefined,
): OperatorIdentityData[] {
  return useMemo(() => {
    const isClosed = incident?.status === 'CLOSED'
    const operatorById = new Map((operators ?? []).map((o) => [o.id, o]))
    const byOperator = new Map<number, OperatorIdentityData>()
    // operatorCheckIns is ordered by checkedInAt desc, so the first entry seen per operator is
    // their most recent check-in on this incident.
    for (const c of operatorCheckIns ?? []) {
      if (byOperator.has(c.operatorId)) continue
      const op = operatorById.get(c.operatorId)
      const canViewContact =
        hasPermission(user ?? null, 'OPERATOR_VIEW_CONTACT') || c.operatorCallsign === user?.callsign
      const showIncident = isClosed || !c.checkedOutAt
      byOperator.set(c.operatorId, {
        id: c.operatorId,
        callsign: c.operatorCallsign,
        name: op?.name ?? c.operatorCallsign,
        licenseClass: op?.licenseClass ?? null,
        role: c.roleName,
        roleColor: c.roleColor,
        roleAccessLevel: c.roleAccessLevel,
        canViewContact,
        phone: op?.phone ?? null,
        email: op?.email ?? null,
        licensePlate: op?.licensePlate ?? null,
        photoUrl: op?.photoUrl ? apiUrl(op.photoUrl) : null,
        credentialNo: credentialNoFor(c.operatorId),
        incident:
          showIncident && incident
            ? { id: incident.id, name: incident.name, ref: incidentRef(incident.id, c.checkedInAt) }
            : null,
        checkedInAt: showIncident ? c.checkedInAt : null,
      })
    }
    return [...byOperator.values()].sort((a, b) => a.callsign.localeCompare(b.callsign))
  }, [operatorCheckIns, operators, incident, user])
}
