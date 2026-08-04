package org.nj2pc.oem.operator;

public record OperatorSummaryResponse(
        Long id,
        String callsign,
        String name
) {
    public static OperatorSummaryResponse from(Operator o) {
        return new OperatorSummaryResponse(o.getId(), o.getCallsign(), o.getName());
    }
}
