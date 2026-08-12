package org.nj2pc.oem.operator;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record OperatorResponse(
        Long id,
        String callsign,
        String name,
        String licenseClass,
        List<String> dmrIds,
        String phone,
        String email,
        OperatorStatus status,
        String notes,
        String addressLine1,
        String addressLine2,
        String addressAttn,
        String latitude,
        String longitude,
        String gridSquare,
        boolean admin,
        boolean hasLoginAccess,
        Instant createdAt,
        String createdByCallsign,
        Set<Permission> permissions
) {
    public static OperatorResponse from(Operator o) {
        return new OperatorResponse(
                o.getId(), o.getCallsign(), o.getName(),
                o.getLicenseClass(), o.getDmrIds(), o.getPhone(), o.getEmail(), o.getStatus(),
                o.getNotes(), o.getAddressLine1(), o.getAddressLine2(), o.getAddressAttn(),
                o.getLatitude(), o.getLongitude(), o.getGridSquare(),
                o.isAdmin(), o.getPasswordHash() != null, o.getCreatedAt(),
                o.getCreatedBy() != null ? o.getCreatedBy().getCallsign() : null,
                o.getPermissions()
        );
    }
}
