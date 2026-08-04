package org.nj2pc.oem.auth;

import org.nj2pc.oem.operator.AccessLevel;

public record AuthResponse(
        String token,
        String callsign,
        String name,
        AccessLevel accessLevel
) {
}
