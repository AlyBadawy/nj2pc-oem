package org.nj2pc.oem.deploymentlocation;

import java.time.Instant;

public record DeploymentLocationResponse(
        Long id,
        Long incidentId,
        String name,
        String latitude,
        String longitude,
        String notes,
        boolean offSite,
        Instant createdAt,
        String createdByCallsign,
        long gearCount
) {
    public static DeploymentLocationResponse from(DeploymentLocation l, long gearCount) {
        return new DeploymentLocationResponse(
                l.getId(), l.getIncident().getId(), l.getName(), l.getLatitude(), l.getLongitude(), l.getNotes(),
                l.isOffSite(), l.getCreatedAt(), l.getCreatedBy() != null ? l.getCreatedBy().getCallsign() : null,
                gearCount
        );
    }
}
