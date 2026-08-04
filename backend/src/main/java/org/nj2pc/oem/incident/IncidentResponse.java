package org.nj2pc.oem.incident;

import java.time.Instant;

public record IncidentResponse(
        Long id,
        String name,
        String location,
        IncidentStatus status,
        Instant plannedStartTime,
        Instant plannedEndTime,
        Instant actualStartTime,
        Instant actualEndTime,
        String description,
        Instant createdAt,
        String createdByCallsign
) {
    public static IncidentResponse from(Incident i) {
        return new IncidentResponse(
                i.getId(), i.getName(), i.getLocation(), i.getStatus(),
                i.getPlannedStartTime(), i.getPlannedEndTime(),
                i.getActualStartTime(), i.getActualEndTime(),
                i.getDescription(), i.getCreatedAt(),
                i.getCreatedBy() != null ? i.getCreatedBy().getCallsign() : null
        );
    }
}
