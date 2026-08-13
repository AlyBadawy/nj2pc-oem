package org.nj2pc.oem.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record SelfProfileUpdateRequest(
        @NotBlank String name,
        String licenseClass,
        List<String> dmrIds,
        String phone,
        @Email String email,
        String notes,
        String addressLine1,
        String addressLine2,
        String addressAttn,
        String latitude,
        String longitude,
        String gridSquare
) {
}
