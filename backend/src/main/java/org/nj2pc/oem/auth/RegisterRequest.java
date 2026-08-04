package org.nj2pc.oem.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.nj2pc.oem.user.Role;

public record RegisterRequest(
        @NotBlank String username,
        @NotBlank String password,
        @NotNull Role role,
        Long operatorId
) {
}
