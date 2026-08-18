package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;

public record IncidentPdfRequest(
        @NotBlank String orientation,   // "LANDSCAPE" | "PORTRAIT" — map page content orientation only
        @NotBlank String mapImageBase64
) {
}
