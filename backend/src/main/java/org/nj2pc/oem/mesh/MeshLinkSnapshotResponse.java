package org.nj2pc.oem.mesh;

public record MeshLinkSnapshotResponse(
        Long id,
        String fromHostname,
        String toHostname,
        String toMacAddress,
        String sourceSection,
        String linkTypeNormalized,
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
        String avgTx
) {
    public static MeshLinkSnapshotResponse from(MeshLinkSnapshot l) {
        return new MeshLinkSnapshotResponse(
                l.getId(), l.getFromHostname(), l.getToHostname(), l.getToMacAddress(), l.getSourceSection(),
                l.getLinkTypeNormalized(), l.getRawLinkType(), l.getLinkQualityStatus(), l.getRxPercent(),
                l.getRttMs(), l.getSnr(), l.getNSnr(), l.getErrorsPercent(), l.getMbps(), l.getDistanceMiles(),
                l.getRxSuccessPercent(), l.getTxSuccessPercent(), l.getRxCost(), l.getTxCost(), l.getPingTimeMs(),
                l.getPingSuccessPercent(), l.getAvgTx()
        );
    }
}
