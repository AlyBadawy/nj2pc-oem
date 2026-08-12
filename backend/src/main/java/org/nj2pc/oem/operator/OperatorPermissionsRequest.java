package org.nj2pc.oem.operator;

import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record OperatorPermissionsRequest(
        @NotNull Set<Permission> permissions
) {
}
