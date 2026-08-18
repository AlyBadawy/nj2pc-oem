package org.nj2pc.oem.checkin;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record OperatorCheckInRequest(
        @NotNull Long operatorId,
        Long roleId,
        String post,
        String notes,
        Instant checkedInAt
) {
}
