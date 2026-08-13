package org.nj2pc.oem.operator;

import org.nj2pc.oem.checkin.OperatorCheckIn;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record OperatorResponse(
        Long id,
        String callsign,
        String name,
        String licenseClass,
        List<String> dmrIds,
        String phone,
        String email,
        OperatorStatus status,
        String notes,
        String addressLine1,
        String addressLine2,
        String addressAttn,
        String latitude,
        String longitude,
        String gridSquare,
        boolean admin,
        boolean hasLoginAccess,
        Instant createdAt,
        String createdByCallsign,
        Set<Permission> permissions,
        String photoUrl,
        CurrentCheckIn currentCheckIn
) {
    public record CurrentCheckIn(
            Long incidentId,
            String incidentName,
            String roleName,
            String roleColor,
            String roleAccessLevel,
            String post,
            Instant checkedInAt
    ) {
        public static CurrentCheckIn from(OperatorCheckIn c) {
            if (c == null) {
                return null;
            }
            return new CurrentCheckIn(
                    c.getIncident().getId(),
                    c.getIncident().getName(),
                    c.getRole() != null ? c.getRole().getName() : null,
                    c.getRole() != null ? c.getRole().getColor() : null,
                    c.getRole() != null ? c.getRole().getAccessLevel() : null,
                    c.getPost(),
                    c.getCheckedInAt()
            );
        }
    }

    public static OperatorResponse from(Operator o) {
        return from(o, true, null);
    }

    public static OperatorResponse from(Operator o, boolean showContact, OperatorCheckIn checkIn) {
        return new OperatorResponse(
                o.getId(), o.getCallsign(), o.getName(),
                o.getLicenseClass(), o.getDmrIds(), showContact ? o.getPhone() : null,
                showContact ? o.getEmail() : null, o.getStatus(),
                o.getNotes(), o.getAddressLine1(), o.getAddressLine2(), o.getAddressAttn(),
                o.getLatitude(), o.getLongitude(), o.getGridSquare(),
                o.isAdmin(), o.getPasswordHash() != null, o.getCreatedAt(),
                o.getCreatedBy() != null ? o.getCreatedBy().getCallsign() : null,
                o.getPermissions(), o.getPhotoPath() != null ? "/api/operators/" + o.getId() + "/photo" : null,
                CurrentCheckIn.from(checkIn)
        );
    }
}
