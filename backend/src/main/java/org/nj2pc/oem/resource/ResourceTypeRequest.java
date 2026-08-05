package org.nj2pc.oem.resource;

import jakarta.validation.constraints.NotBlank;

public record ResourceTypeRequest(
        @NotBlank String name
) {
}
