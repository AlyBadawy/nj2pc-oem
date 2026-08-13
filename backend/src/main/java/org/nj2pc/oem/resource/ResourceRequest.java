package org.nj2pc.oem.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record ResourceRequest(
        @NotNull Long resourceTypeId,
        @NotBlank String identifier,
        String serialNumber,
        Long ownerId,
        String notes,
        Map<String, Object> customFields
) {
}
