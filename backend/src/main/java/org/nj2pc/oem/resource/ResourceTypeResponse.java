package org.nj2pc.oem.resource;

import java.time.Instant;
import java.util.List;

public record ResourceTypeResponse(
        Long id,
        String name,
        Instant createdAt,
        List<ResourceTypeFieldResponse> fields
) {
    public static ResourceTypeResponse from(ResourceType type) {
        List<ResourceTypeFieldResponse> fields = type.getFields() != null
                ? type.getFields().stream().map(ResourceTypeFieldResponse::from).toList()
                : List.of();
        return new ResourceTypeResponse(type.getId(), type.getName(), type.getCreatedAt(), fields);
    }
}
