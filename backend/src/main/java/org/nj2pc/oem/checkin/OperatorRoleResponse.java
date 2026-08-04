package org.nj2pc.oem.checkin;

import java.time.Instant;

public record OperatorRoleResponse(
        Long id,
        String name,
        Instant createdAt
) {
    public static OperatorRoleResponse from(OperatorRole role) {
        return new OperatorRoleResponse(role.getId(), role.getName(), role.getCreatedAt());
    }
}
