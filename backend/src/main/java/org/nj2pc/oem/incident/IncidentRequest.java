package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record IncidentRequest(
        @NotBlank String name,
        String location,
        @NotNull IncidentStatus status,
        Instant startTime,
        Instant endTime,
        String description
) {
}
