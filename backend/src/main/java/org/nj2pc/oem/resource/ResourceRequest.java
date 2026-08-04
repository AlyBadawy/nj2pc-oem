package org.nj2pc.oem.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ResourceRequest(
        @NotNull ResourceType type,
        @NotBlank String identifier,
        String frequency,
        @NotNull ResourceStatus status,
        Long assignedOperatorId,
        Long assignedIncidentId,
        String notes
) {
}
