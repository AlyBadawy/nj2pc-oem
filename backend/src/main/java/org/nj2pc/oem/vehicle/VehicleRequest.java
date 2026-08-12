package org.nj2pc.oem.vehicle;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record VehicleRequest(
        @NotNull Integer year,
        @NotBlank String make,
        @NotBlank String model,
        String color,
        @NotBlank String licensePlateNumber,
        @NotBlank String licensePlateState,
        String notes
) {
}
