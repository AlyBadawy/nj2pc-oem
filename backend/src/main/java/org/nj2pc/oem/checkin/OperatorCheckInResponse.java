package org.nj2pc.oem.checkin;

import java.time.Instant;

public record OperatorCheckInResponse(
        Long id,
        Long incidentId,
        Long operatorId,
        String operatorCallsign,
        Instant checkedInAt,
        Instant checkedOutAt,
        String notes
) {
    public static OperatorCheckInResponse from(OperatorCheckIn c) {
        return new OperatorCheckInResponse(
                c.getId(), c.getIncident().getId(), c.getOperator().getId(), c.getOperator().getCallsign(),
                c.getCheckedInAt(), c.getCheckedOutAt(), c.getNotes()
        );
    }
}
