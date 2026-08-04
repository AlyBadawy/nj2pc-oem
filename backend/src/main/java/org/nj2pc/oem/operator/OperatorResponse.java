package org.nj2pc.oem.operator;

import java.time.Instant;

public record OperatorResponse(
        Long id,
        String callsign,
        String name,
        String licenseClass,
        String dmrId,
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
        Instant createdAt
) {
    public static OperatorResponse from(Operator o) {
        return new OperatorResponse(
                o.getId(), o.getCallsign(), o.getName(),
                o.getLicenseClass(), o.getDmrId(), o.getPhone(), o.getEmail(), o.getStatus(),
                o.getNotes(), o.getAddressLine1(), o.getAddressLine2(), o.getAddressAttn(),
                o.getLatitude(), o.getLongitude(), o.getGridSquare(), o.getCreatedAt()
        );
    }
}
