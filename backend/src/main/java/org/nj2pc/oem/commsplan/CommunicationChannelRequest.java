package org.nj2pc.oem.commsplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CommunicationChannelRequest(
        @NotBlank String zoneGroup,
        @NotNull Integer channelNumber,
        @NotBlank String function,
        @NotBlank String channelName,
        String assignment,
        String rxFrequency,
        String rxTone,
        String txFrequency,
        String txTone,
        @NotNull ChannelMode mode,
        String remarks
) {
}
