package org.nj2pc.oem.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ResourceRequest(
        @NotNull Long resourceTypeId,
        @NotBlank String identifier,
        String serialNumber,
        Long ownerId,
        String notes
) {
}
