package org.nj2pc.oem.commsplan;

import java.time.Instant;

public record IncidentCommsPlanApplicationResponse(
        Long id, Long communicationPlanId, String planName, int planVersion,
        Instant appliedAt, String appliedByCallsign, Instant revokedAt, String revokedByCallsign
) {
    public static IncidentCommsPlanApplicationResponse from(IncidentCommsPlanApplication a) {
        return new IncidentCommsPlanApplicationResponse(
                a.getId(), a.getCommunicationPlan().getId(), a.getCommunicationPlan().getName(),
                a.getCommunicationPlan().getVersion(), a.getAppliedAt(),
                a.getAppliedBy() != null ? a.getAppliedBy().getCallsign() : null,
                a.getRevokedAt(),
                a.getRevokedBy() != null ? a.getRevokedBy().getCallsign() : null
        );
    }
}
