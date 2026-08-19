package org.nj2pc.oem.checkin;

import java.util.List;

/** One base64 image per team-roster PDF page (up to 8 credential cards each, 4x2 grid) — a
 * client-side capture of the actual rendered CredentialCardCompact components, same pattern as
 * the incident map's mapImageBase64, so the PDF card matches the web page pixel-for-pixel. */
public record OperatorTimesheetPdfRequest(
        List<String> teamCardsImageBase64
) {
}
