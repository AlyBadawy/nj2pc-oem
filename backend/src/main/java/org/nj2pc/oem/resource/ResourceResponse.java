package org.nj2pc.oem.resource;

import java.util.Map;

public record ResourceResponse(
        Long id,
        Long resourceTypeId,
        String resourceTypeName,
        String identifier,
        String serialNumber,
        Long ownerId,
        String ownerCallsign,
        String notes,
        Map<String, Object> customFields,
        String lastDeploymentLocationName
) {
    public static ResourceResponse from(Resource r) {
        return from(r, null);
    }

    public static ResourceResponse from(Resource r, String lastDeploymentLocationName) {
        return new ResourceResponse(
                r.getId(),
                r.getType().getId(),
                r.getType().getName(),
                r.getIdentifier(),
                r.getSerialNumber(),
                r.getOwner() != null ? r.getOwner().getId() : null,
                r.getOwner() != null ? r.getOwner().getCallsign() : null,
                r.getNotes(),
                r.getCustomFields(),
                lastDeploymentLocationName
        );
    }
}
