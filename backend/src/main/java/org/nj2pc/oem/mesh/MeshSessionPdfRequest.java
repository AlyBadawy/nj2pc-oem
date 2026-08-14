package org.nj2pc.oem.mesh;

import jakarta.validation.constraints.NotBlank;

public record MeshSessionPdfRequest(
        @NotBlank String orientation,
        @NotBlank String linkFilter,
        @NotBlank String mapImageBase64
) {
}
