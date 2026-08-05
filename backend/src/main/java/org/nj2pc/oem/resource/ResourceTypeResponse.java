package org.nj2pc.oem.resource;

import java.time.Instant;

public record ResourceTypeResponse(
        Long id,
        String name,
        Instant createdAt
) {
    public static ResourceTypeResponse from(ResourceType type) {
        return new ResourceTypeResponse(type.getId(), type.getName(), type.getCreatedAt());
    }
}
