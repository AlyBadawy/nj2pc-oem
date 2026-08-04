package org.nj2pc.oem.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String callsign,
        @NotBlank String password
) {
}
