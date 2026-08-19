package org.nj2pc.oem.incident;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record IncidentPdfRequest(
        @NotBlank String orientation,   // "LANDSCAPE" | "PORTRAIT" — map page content orientation only
        @NotBlank String mapImageBase64,
        // One base64 image per team-roster PDF page (up to 8 credential cards each, 4x2 grid) —
        // a client-side capture of the actual rendered CredentialCardCompact components, same
        // pattern as mapImageBase64, so the PDF card matches the web page pixel-for-pixel.
        List<String> teamCardsImageBase64
) {
}
