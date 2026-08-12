package org.nj2pc.oem.incident;

public record IncidentPermissionGrantResponse(
        Long operatorId,
        String operatorCallsign,
        IncidentPermission permission
) {
    public static IncidentPermissionGrantResponse from(IncidentPermissionGrant grant) {
        return new IncidentPermissionGrantResponse(
                grant.getOperator().getId(),
                grant.getOperator().getCallsign(),
                grant.getPermission()
        );
    }
}
