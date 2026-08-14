package org.nj2pc.oem.incident;

import java.time.Instant;
import java.util.List;
import java.util.Map;

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
        List<Map<String, String>> boundaryPoints,
        Instant createdAt,
        String createdByCallsign,
        boolean canEdit
) {
    public static IncidentResponse from(Incident i, boolean canEdit) {
        return new IncidentResponse(
                i.getId(), i.getName(), i.getLocation(), i.getStatus(),
                i.getPlannedStartTime(), i.getPlannedEndTime(),
                i.getActualStartTime(), i.getActualEndTime(),
                i.getDescription(), i.getBoundaryPoints(), i.getCreatedAt(),
                i.getCreatedBy() != null ? i.getCreatedBy().getCallsign() : null,
                canEdit
        );
    }
}
