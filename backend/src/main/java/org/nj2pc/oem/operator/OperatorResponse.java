package org.nj2pc.oem.operator;

import java.time.Instant;

public record OperatorResponse(
        Long id,
        String callsign,
        String name,
        String licenseClass,
        String phone,
        String email,
        OperatorStatus status,
        String notes,
        Instant createdAt
) {
    public static OperatorResponse from(Operator o) {
        return new OperatorResponse(
                o.getId(), o.getCallsign(), o.getName(),
                o.getLicenseClass(), o.getPhone(), o.getEmail(), o.getStatus(),
                o.getNotes(), o.getCreatedAt()
        );
    }
}
