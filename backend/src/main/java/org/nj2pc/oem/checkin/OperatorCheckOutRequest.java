package org.nj2pc.oem.checkin;

import java.time.Instant;

public record OperatorCheckOutRequest(
        Instant checkedOutAt
) {
}
