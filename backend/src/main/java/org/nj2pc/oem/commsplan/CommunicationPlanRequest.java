package org.nj2pc.oem.commsplan;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public record CommunicationPlanRequest(
        @NotBlank String name,
        Instant operationalPeriodStart,
        Instant operationalPeriodEnd,
        String specialInstructions,
        String preparedByName,
        String preparedByCallsign,
        Instant preparedAt,
        String approvedByName,
        String approvedByCallsign,
        Instant approvedAt
) {
}
