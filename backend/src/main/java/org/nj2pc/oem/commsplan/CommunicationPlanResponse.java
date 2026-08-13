package org.nj2pc.oem.commsplan;

import java.time.Instant;
import java.util.List;

public record CommunicationPlanResponse(
        Long id,
        String name,
        Instant operationalPeriodStart,
        Instant operationalPeriodEnd,
        String specialInstructions,
        String preparedByName,
        String preparedByCallsign,
        Instant preparedAt,
        String approvedByName,
        String approvedByCallsign,
        Instant approvedAt,
        Instant createdAt,
        List<IncidentSummary> incidents,
        int version,
        Long rootPlanId,
        boolean active
) {
    public record IncidentSummary(Long id, String name) {
    }

    public static CommunicationPlanResponse from(CommunicationPlan p) {
        List<IncidentSummary> incidents = p.getIncidents().stream()
                .map(i -> new IncidentSummary(i.getId(), i.getName()))
                .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
                .toList();
        return new CommunicationPlanResponse(
                p.getId(), p.getName(), p.getOperationalPeriodStart(), p.getOperationalPeriodEnd(),
                p.getSpecialInstructions(), p.getPreparedByName(), p.getPreparedByCallsign(), p.getPreparedAt(),
                p.getApprovedByName(), p.getApprovedByCallsign(), p.getApprovedAt(), p.getCreatedAt(),
                incidents, p.getVersion(), p.getRootPlanId(), p.isActive()
        );
    }
}
