package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IncidentLogRequest(
        @NotNull Long operatorId,
        Long toOperatorId,
        @NotBlank String subject,
        @NotBlank String message,
        @NotNull Priority priority
) {
}
