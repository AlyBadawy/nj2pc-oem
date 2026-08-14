package org.nj2pc.oem.checkin;

import java.time.Instant;

public record ResourceCheckInResponse(
        Long id,
        Long incidentId,
        Long resourceId,
        String resourceIdentifier,
        String resourceTypeName,
        Instant checkedInAt,
        Instant checkedOutAt,
        String notes,
        String latitude,
        String longitude
) {
    public static ResourceCheckInResponse from(ResourceCheckIn c) {
        return new ResourceCheckInResponse(
                c.getId(), c.getIncident().getId(), c.getResource().getId(), c.getResource().getIdentifier(),
                c.getResource().getType().getName(), c.getCheckedInAt(), c.getCheckedOutAt(), c.getNotes(),
                c.getLatitude(), c.getLongitude()
        );
    }
}
