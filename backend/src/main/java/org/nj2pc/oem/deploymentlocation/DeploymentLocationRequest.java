package org.nj2pc.oem.deploymentlocation;

import jakarta.validation.constraints.NotBlank;

public record DeploymentLocationRequest(
        @NotBlank String name,
        String latitude,
        String longitude,
        String notes,
        boolean offSite
) {
}
