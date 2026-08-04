package org.nj2pc.oem.auth;

import org.nj2pc.oem.user.Role;

public record AuthResponse(
        String token,
        String username,
        Role role
) {
}
