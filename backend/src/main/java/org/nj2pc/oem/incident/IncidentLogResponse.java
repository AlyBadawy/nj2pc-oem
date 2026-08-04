package org.nj2pc.oem.incident;

import java.time.Instant;

public record IncidentLogResponse(
        Long id,
        Long incidentId,
        Long operatorId,
        String operatorCallsign,
        Long toOperatorId,
        String toOperatorCallsign,
        String subject,
        String message,
        Priority priority,
        Instant loggedAt
) {
    public static IncidentLogResponse from(IncidentLog log) {
        return new IncidentLogResponse(
                log.getId(),
                log.getIncident().getId(),
                log.getOperator() != null ? log.getOperator().getId() : null,
                log.getOperator() != null ? log.getOperator().getCallsign() : null,
                log.getToOperator() != null ? log.getToOperator().getId() : null,
                log.getToOperator() != null ? log.getToOperator().getCallsign() : null,
                log.getSubject(),
                log.getMessage(),
                log.getPriority(),
                log.getLoggedAt()
        );
    }
}
