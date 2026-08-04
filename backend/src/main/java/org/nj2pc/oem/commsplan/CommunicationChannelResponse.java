package org.nj2pc.oem.commsplan;

public record CommunicationChannelResponse(
        Long id,
        Long planId,
        String zoneGroup,
        Integer channelNumber,
        String function,
        String channelName,
        String assignment,
        String rxFrequency,
        String rxTone,
        String txFrequency,
        String txTone,
        ChannelMode mode,
        String remarks
) {
    public static CommunicationChannelResponse from(CommunicationChannel c) {
        return new CommunicationChannelResponse(
                c.getId(), c.getPlan().getId(), c.getZoneGroup(), c.getChannelNumber(), c.getFunction(),
                c.getChannelName(), c.getAssignment(), c.getRxFrequency(), c.getRxTone(),
                c.getTxFrequency(), c.getTxTone(), c.getMode(), c.getRemarks()
        );
    }
}
