package org.nj2pc.oem.checkin;

public record ResourceCheckInUpdateRequest(
        String notes,
        String latitude,
        String longitude,
        boolean offSite
) {
}
