package org.nj2pc.oem.checkin;

import jakarta.validation.constraints.NotBlank;

public record OperatorRoleRequest(
        @NotBlank String name,
        @NotBlank String color,
        @NotBlank String accessLevel
) {
}
