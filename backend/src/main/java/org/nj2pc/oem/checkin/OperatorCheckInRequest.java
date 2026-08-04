package org.nj2pc.oem.checkin;

import jakarta.validation.constraints.NotNull;

public record OperatorCheckInRequest(
        @NotNull Long operatorId,
        String notes
) {
}
