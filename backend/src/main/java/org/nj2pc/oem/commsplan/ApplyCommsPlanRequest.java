package org.nj2pc.oem.commsplan;

import jakarta.validation.constraints.NotNull;

public record ApplyCommsPlanRequest(@NotNull Long communicationPlanId) {
}
