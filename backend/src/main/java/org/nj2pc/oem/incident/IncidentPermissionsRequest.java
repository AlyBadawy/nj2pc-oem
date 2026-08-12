package org.nj2pc.oem.incident;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record IncidentPermissionsRequest(
        @NotNull List<@Valid Grant> grants
) {
    public record Grant(
            @NotNull Long operatorId,
            @NotNull IncidentPermission permission
    ) {
    }
}
