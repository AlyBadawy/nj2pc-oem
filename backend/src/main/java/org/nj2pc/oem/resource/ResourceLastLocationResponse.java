package org.nj2pc.oem.resource;

import java.time.Instant;

public record ResourceLastLocationResponse(
        String latitude,
        String longitude,
        Instant checkedInAt,
        Long incidentId,
        String incidentName
) {
}
