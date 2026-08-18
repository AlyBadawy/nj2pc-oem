package org.nj2pc.oem.mesh;

import java.util.Map;

public record MeshNodeSnapshotResponse(
        Long id,
        String hostname,
        boolean isLocalNode,
        String macAddress,
        String meshIpAddress,
        String linkLocalAddress,
        String model,
        String firmwareVersion,
        String latitude,
        String longitude,
        String claimedDistanceMi,
        String channel,
        String band,
        String frequencyMhz,
        String channelWidth,
        String rfPowerDbm,
        Long resourceId,
        String resourceIdentifier,
        String resourceOwnerCallsign,
        String resourceTypeName,
        Map<String, Object> resourceCustomFields
) {
    public static MeshNodeSnapshotResponse from(MeshNodeSnapshot n) {
        return new MeshNodeSnapshotResponse(
                n.getId(), n.getHostname(), n.isLocalNode(), n.getMacAddress(), n.getMeshIpAddress(),
                n.getLinkLocalAddress(), n.getModel(), n.getFirmwareVersion(), n.getLatitude(), n.getLongitude(),
                n.getClaimedDistanceMi(), n.getChannel(), n.getBand(), n.getFrequencyMhz(), n.getChannelWidth(),
                n.getRfPowerDbm(),
                n.getResource() != null ? n.getResource().getId() : null,
                n.getResource() != null ? n.getResource().getIdentifier() : null,
                n.getResource() != null && n.getResource().getOwner() != null ? n.getResource().getOwner().getCallsign() : null,
                n.getResource() != null ? n.getResource().getType().getName() : null,
                n.getResource() != null ? n.getResource().getCustomFields() : null
        );
    }
}
