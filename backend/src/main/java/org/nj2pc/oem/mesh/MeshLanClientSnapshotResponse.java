package org.nj2pc.oem.mesh;

import java.util.Map;

public record MeshLanClientSnapshotResponse(
        Long id,
        String nodeHostname,
        String deviceHostname,
        String deviceUrl,
        Long resourceId,
        String resourceIdentifier,
        String resourceOwnerCallsign,
        Map<String, Object> resourceCustomFields
) {
    public static MeshLanClientSnapshotResponse from(MeshLanClientSnapshot c) {
        return new MeshLanClientSnapshotResponse(
                c.getId(), c.getNodeHostname(), c.getDeviceHostname(), c.getDeviceUrl(),
                c.getResource() != null ? c.getResource().getId() : null,
                c.getResource() != null ? c.getResource().getIdentifier() : null,
                c.getResource() != null && c.getResource().getOwner() != null ? c.getResource().getOwner().getCallsign() : null,
                c.getResource() != null ? c.getResource().getCustomFields() : null
        );
    }
}
