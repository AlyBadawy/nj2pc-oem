package org.nj2pc.oem.pdf;

import java.time.Instant;

/** Everything OperatorCredentialPdfSupport needs to draw one compact credential card — mirrors
 * the fields OperatorIdentityData carries on the frontend (frontend/src/lib/identity.ts). */
public record OperatorCredentialCardData(
        Long id,
        String callsign,
        String name,
        String licenseClass,
        String roleName,
        String roleColor,
        String roleAccessLevel,
        String phone,
        String email,
        String licensePlate,
        boolean canViewContact,
        byte[] photoBytes,
        boolean checkedIn,
        Instant checkedInAt,
        String incidentName
) {
}
