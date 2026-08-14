package org.nj2pc.oem.mesh;

import java.time.Instant;

public record MeshSessionSummaryResponse(
        Long id,
        Long incidentId,
        String label,
        Instant capturedAt,
        String createdByCallsign,
        String localNodeHostname,
        long nodeCount,
        long linkCount
) {
}
