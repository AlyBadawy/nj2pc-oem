package org.nj2pc.oem.auditlog;

import java.time.Instant;

public record AuditLogEntryResponse(
        Long id,
        EntityType entityType,
        Long entityId,
        String action,
        String summary,
        String performedByCallsign,
        String performedIp,
        Instant performedAt
) {
    public static AuditLogEntryResponse from(AuditLogEntry e) {
        return new AuditLogEntryResponse(
                e.getId(),
                e.getEntityType(),
                e.getEntityId(),
                e.getAction(),
                e.getSummary(),
                e.getPerformedBy() != null ? e.getPerformedBy().getCallsign() : null,
                e.getPerformedIp(),
                e.getPerformedAt()
        );
    }
}
