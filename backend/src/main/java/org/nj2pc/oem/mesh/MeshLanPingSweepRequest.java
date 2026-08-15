package org.nj2pc.oem.mesh;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MeshLanPingSweepRequest(
        @NotEmpty List<@Valid Target> targets
) {
    public record Target(
            @NotBlank String nodeHostname,
            @NotEmpty List<@NotBlank String> ips
    ) {
    }
}
