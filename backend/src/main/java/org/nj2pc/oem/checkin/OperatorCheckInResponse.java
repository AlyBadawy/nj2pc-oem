package org.nj2pc.oem.checkin;

import java.time.Instant;

public record OperatorCheckInResponse(
        Long id,
        Long incidentId,
        Long operatorId,
        String operatorCallsign,
        Long roleId,
        String roleName,
        String post,
        Instant checkedInAt,
        Instant checkedOutAt,
        String notes
) {
    public static OperatorCheckInResponse from(OperatorCheckIn c) {
        return new OperatorCheckInResponse(
                c.getId(), c.getIncident().getId(), c.getOperator().getId(), c.getOperator().getCallsign(),
                c.getRole() != null ? c.getRole().getId() : null,
                c.getRole() != null ? c.getRole().getName() : null,
                c.getPost(), c.getCheckedInAt(), c.getCheckedOutAt(), c.getNotes()
        );
    }
}
