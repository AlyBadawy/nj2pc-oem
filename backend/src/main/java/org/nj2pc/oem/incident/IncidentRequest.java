package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public record IncidentRequest(
        @NotBlank String name,
        String location,
        Instant plannedStartTime,
        Instant plannedEndTime,
        String description
) {
}
