package org.nj2pc.oem.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ResourceTypeFieldRequest(
        @NotBlank String name,
        @NotNull ResourceFieldType fieldType,
        boolean required,
        List<String> options
) {
}
