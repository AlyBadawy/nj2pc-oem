package org.nj2pc.oem.vehicle;

import java.util.List;
import java.util.stream.Collectors;

/** Formats an operator's vehicles into the "PLATE(STATE)" summary shown on their credential
 * card — shared by OperatorService/AuthService since both build operator credential responses. */
public final class VehiclePlateFormatter {

    private VehiclePlateFormatter() {
    }

    public static String summarize(List<Vehicle> vehicles) {
        if (vehicles == null || vehicles.isEmpty()) {
            return "";
        }
        return vehicles.stream()
                .map(v -> v.getLicensePlateNumber() + "(" + v.getLicensePlateState() + ")")
                .collect(Collectors.joining(", "));
    }
}
