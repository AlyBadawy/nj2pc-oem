package org.nj2pc.oem.resource;

public record ResourceResponse(
        Long id,
        Long resourceTypeId,
        String resourceTypeName,
        String identifier,
        String serialNumber,
        Long ownerId,
        String ownerCallsign,
        String notes
) {
    public static ResourceResponse from(Resource r) {
        return new ResourceResponse(
                r.getId(),
                r.getType().getId(),
                r.getType().getName(),
                r.getIdentifier(),
                r.getSerialNumber(),
                r.getOwner() != null ? r.getOwner().getId() : null,
                r.getOwner() != null ? r.getOwner().getCallsign() : null,
                r.getNotes()
        );
    }
}
