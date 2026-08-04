package org.nj2pc.oem.operator;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OperatorRequest(
        @NotBlank String callsign,
        @NotBlank String name,
        String licenseClass,
        List<String> dmrIds,
        String phone,
        @Email String email,
        @NotNull OperatorStatus status,
        String notes,
        String addressLine1,
        String addressLine2,
        String addressAttn,
        String latitude,
        String longitude,
        String gridSquare,
        @NotNull AccessLevel accessLevel,
        @Size(min = 8) String password
) {
}
