package org.nj2pc.oem.mesh;

import java.time.Instant;
import java.util.List;

public record MeshSessionDetailResponse(
        Long id,
        Long incidentId,
        String label,
        Instant capturedAt,
        String createdByCallsign,
        String localNodeHostname,
        String notes,
        List<MeshNodeSnapshotResponse> nodes,
        List<MeshLinkSnapshotResponse> links,
        List<MeshLanClientSnapshotResponse> lanClients
) {
}
