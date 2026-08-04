package org.nj2pc.oem.operator;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OperatorRequest(
        @NotBlank String callsign,
        @NotBlank String name,
        String licenseClass,
        String phone,
        @Email String email,
        @NotNull OperatorStatus status,
        String notes
) {
}
