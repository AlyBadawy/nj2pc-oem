package org.nj2pc.oem.checkin;

import jakarta.validation.constraints.NotNull;

public record ResourceCheckInRequest(
        @NotNull Long resourceId,
        String notes
) {
}
