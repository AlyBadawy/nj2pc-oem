package org.nj2pc.oem.resource;

public record ResourceResponse(
        Long id,
        ResourceType type,
        String identifier,
        String frequency,
        ResourceStatus status,
        Long assignedOperatorId,
        String assignedOperatorCallsign,
        Long assignedIncidentId,
        String assignedIncidentName,
        String notes
) {
    public static ResourceResponse from(Resource r) {
        return new ResourceResponse(
                r.getId(), r.getType(), r.getIdentifier(), r.getFrequency(), r.getStatus(),
                r.getAssignedOperator() != null ? r.getAssignedOperator().getId() : null,
                r.getAssignedOperator() != null ? r.getAssignedOperator().getCallsign() : null,
                r.getAssignedIncident() != null ? r.getAssignedIncident().getId() : null,
                r.getAssignedIncident() != null ? r.getAssignedIncident().getName() : null,
                r.getNotes()
        );
    }
}
