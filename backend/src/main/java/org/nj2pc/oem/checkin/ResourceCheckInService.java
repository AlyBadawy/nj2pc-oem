package org.nj2pc.oem.checkin;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.incident.IncidentStatus;
import org.nj2pc.oem.resource.Resource;
import org.nj2pc.oem.resource.ResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ResourceCheckInService {

    private final ResourceCheckInRepository resourceCheckInRepository;
    private final IncidentRepository incidentRepository;
    private final ResourceRepository resourceRepository;

    public ResourceCheckInService(ResourceCheckInRepository resourceCheckInRepository,
                                   IncidentRepository incidentRepository,
                                   ResourceRepository resourceRepository) {
        this.resourceCheckInRepository = resourceCheckInRepository;
        this.incidentRepository = incidentRepository;
        this.resourceRepository = resourceRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceCheckInResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return resourceCheckInRepository.findByIncidentIdOrderByCheckedInAtDesc(incidentId).stream()
                .map(ResourceCheckInResponse::from).toList();
    }

    @Transactional
    public ResourceCheckInResponse checkIn(Long incidentId, ResourceCheckInRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Cannot check in to a closed incident");
        }
        Resource resource = resourceRepository.findById(request.resourceId())
                .orElseThrow(() -> ApiException.notFound("Resource not found: " + request.resourceId()));

        resourceCheckInRepository.findByIncidentIdAndResourceIdAndCheckedOutAtIsNull(incidentId, request.resourceId())
                .ifPresent(existing -> {
                    throw ApiException.conflict(resource.getIdentifier() + " is already checked in to this incident");
                });

        ResourceCheckIn checkIn = new ResourceCheckIn();
        checkIn.setIncident(incident);
        checkIn.setResource(resource);
        checkIn.setCheckedInAt(Instant.now());
        checkIn.setNotes(request.notes());
        ResourceCheckIn saved = resourceCheckInRepository.save(checkIn);
        return ResourceCheckInResponse.from(saved);
    }

    @Transactional
    public ResourceCheckInResponse checkOut(Long incidentId, Long checkInId) {
        ResourceCheckIn checkIn = getCheckInOrThrow(incidentId, checkInId);
        if (checkIn.getCheckedOutAt() != null) {
            throw ApiException.badRequest("Already checked out");
        }
        checkIn.setCheckedOutAt(Instant.now());
        ResourceCheckIn saved = resourceCheckInRepository.save(checkIn);
        return ResourceCheckInResponse.from(saved);
    }

    @Transactional
    public void checkOutAllOpen(Long incidentId) {
        Instant now = Instant.now();
        List<ResourceCheckIn> open = resourceCheckInRepository.findByIncidentIdAndCheckedOutAtIsNull(incidentId);
        open.forEach(c -> c.setCheckedOutAt(now));
        resourceCheckInRepository.saveAll(open);
    }

    private ResourceCheckIn getCheckInOrThrow(Long incidentId, Long checkInId) {
        ResourceCheckIn checkIn = resourceCheckInRepository.findById(checkInId)
                .orElseThrow(() -> ApiException.notFound("Check-in not found: " + checkInId));
        if (!checkIn.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Check-in not found on incident " + incidentId + ": " + checkInId);
        }
        return checkIn;
    }
}
