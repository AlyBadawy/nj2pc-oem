package org.nj2pc.oem.auth;

import org.nj2pc.oem.operator.Permission;

import java.util.Set;

public record AuthResponse(
        String token,
        String callsign,
        String name,
        boolean admin,
        Set<Permission> permissions
) {
}
