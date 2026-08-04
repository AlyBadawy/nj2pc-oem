package org.nj2pc.oem.incident;

import java.time.Instant;

public record IncidentResponse(
        Long id,
        String name,
        String location,
        IncidentStatus status,
        Instant startTime,
        Instant endTime,
        String description,
        Instant createdAt
) {
    public static IncidentResponse from(Incident i) {
        return new IncidentResponse(
                i.getId(), i.getName(), i.getLocation(), i.getStatus(),
                i.getStartTime(), i.getEndTime(), i.getDescription(), i.getCreatedAt()
        );
    }
}
