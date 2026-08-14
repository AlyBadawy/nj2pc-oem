package org.nj2pc.oem.mesh;

public record MeshLanClientSnapshotResponse(
        Long id,
        String nodeHostname,
        String deviceHostname,
        String deviceUrl
) {
    public static MeshLanClientSnapshotResponse from(MeshLanClientSnapshot c) {
        return new MeshLanClientSnapshotResponse(c.getId(), c.getNodeHostname(), c.getDeviceHostname(), c.getDeviceUrl());
    }
}
