package org.nj2pc.oem.vehicle;

import java.time.Instant;

public record VehicleResponse(
        Long id,
        Long operatorId,
        String operatorCallsign,
        Integer year,
        String make,
        String model,
        String color,
        String licensePlateNumber,
        String licensePlateState,
        String notes,
        Instant createdAt
) {
    public static VehicleResponse from(Vehicle v) {
        return new VehicleResponse(
                v.getId(),
                v.getOperator().getId(),
                v.getOperator().getCallsign(),
                v.getYear(),
                v.getMake(),
                v.getModel(),
                v.getColor(),
                v.getLicensePlateNumber(),
                v.getLicensePlateState(),
                v.getNotes(),
                v.getCreatedAt()
        );
    }
}
