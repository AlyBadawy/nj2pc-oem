package org.nj2pc.oem.checkin;

import java.time.Instant;

public record OperatorRoleResponse(
        Long id,
        String name,
        String color,
        String accessLevel,
        int sortOrder,
        Instant createdAt
) {
    public static OperatorRoleResponse from(OperatorRole role) {
        return new OperatorRoleResponse(
                role.getId(), role.getName(), role.getColor(), role.getAccessLevel(),
                role.getSortOrder(), role.getCreatedAt()
        );
    }
}
