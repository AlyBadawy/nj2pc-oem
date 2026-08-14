package org.nj2pc.oem.mesh;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record MeshSessionSubmitRequest(
        String label,
        Instant capturedAt,
        String notes,
        @NotBlank String localNodeHostname,
        @NotEmpty List<NodeInput> nodes,
        List<LinkInput> links,
        List<LanClientInput> lanClients
) {
    public record NodeInput(
            @NotBlank String hostname,
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
            Map<String, Object> rawJson
    ) {
    }

    public record LinkInput(
            @NotBlank String fromHostname,
            @NotBlank String toHostname,
            String toMacAddress,
            @NotBlank String sourceSection,
            @NotBlank String linkTypeNormalized,
            String rawLinkType,
            String linkQualityStatus,
            String rxPercent,
            String rttMs,
            String snr,
            String nSnr,
            String errorsPercent,
            String mbps,
            String distanceMiles,
            String rxSuccessPercent,
            String txSuccessPercent,
            String rxCost,
            String txCost,
            String pingTimeMs,
            String pingSuccessPercent,
            String avgTx,
            Map<String, Object> rawJson
    ) {
    }

    public record LanClientInput(
            @NotBlank String nodeHostname,
            @NotBlank String deviceHostname,
            String deviceUrl
    ) {
    }
}
