package org.nj2pc.oem.checkin;

import org.nj2pc.oem.resource.ResourceType;

import java.time.Instant;

public record ResourceCheckInResponse(
        Long id,
        Long incidentId,
        Long resourceId,
        String resourceIdentifier,
        ResourceType resourceType,
        Instant checkedInAt,
        Instant checkedOutAt,
        String notes
) {
    public static ResourceCheckInResponse from(ResourceCheckIn c) {
        return new ResourceCheckInResponse(
                c.getId(), c.getIncident().getId(), c.getResource().getId(), c.getResource().getIdentifier(),
                c.getResource().getType(), c.getCheckedInAt(), c.getCheckedOutAt(), c.getNotes()
        );
    }
}
