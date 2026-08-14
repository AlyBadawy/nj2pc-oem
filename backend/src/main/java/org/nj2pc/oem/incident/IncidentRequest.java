package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record IncidentRequest(
        @NotBlank String name,
        String location,
        Instant plannedStartTime,
        Instant plannedEndTime,
        String description,
        List<Map<String, String>> boundaryPoints
) {
}
