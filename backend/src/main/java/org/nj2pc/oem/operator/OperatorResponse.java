package org.nj2pc.oem.operator;

import java.time.Instant;

public record OperatorResponse(
        Long id,
        String callsign,
        String firstName,
        String lastName,
        String licenseClass,
        String phone,
        String email,
        OperatorStatus status,
        String notes,
        Instant createdAt
) {
    public static OperatorResponse from(Operator o) {
        return new OperatorResponse(
                o.getId(), o.getCallsign(), o.getFirstName(), o.getLastName(),
                o.getLicenseClass(), o.getPhone(), o.getEmail(), o.getStatus(),
                o.getNotes(), o.getCreatedAt()
        );
    }
}
