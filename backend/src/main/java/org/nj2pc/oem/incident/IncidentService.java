package org.nj2pc.oem.incident;

import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInService;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final OperatorRepository operatorRepository;
    private final OperatorCheckInService operatorCheckInService;
    private final ResourceCheckInService resourceCheckInService;

    public IncidentService(IncidentRepository incidentRepository,
                            OperatorRepository operatorRepository,
                            OperatorCheckInService operatorCheckInService,
                            ResourceCheckInService resourceCheckInService) {
        this.incidentRepository = incidentRepository;
        this.operatorRepository = operatorRepository;
        this.operatorCheckInService = operatorCheckInService;
        this.resourceCheckInService = resourceCheckInService;
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> findAll(Authentication authentication) {
        List<Incident> incidents = incidentRepository.findAll();
        if (isAdmin(authentication)) {
            return incidents.stream().map(IncidentResponse::from).toList();
        }
        return incidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.ACTIVE || i.getStatus() == IncidentStatus.PLANNED)
                .map(IncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public IncidentResponse findById(Authentication authentication, Long id) {
        Incident incident = getIncidentOrThrow(id);
        if (!isAdmin(authentication)
                && incident.getStatus() != IncidentStatus.ACTIVE && incident.getStatus() != IncidentStatus.PLANNED) {
            throw ApiException.forbidden("You do not have permission to view this incident");
        }
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse create(IncidentRequest request, String creatorCallsign) {
        Incident incident = new Incident();
        applyRequest(incident, request);
        if (creatorCallsign != null) {
            operatorRepository.findByCallsignIgnoreCase(creatorCallsign).ifPresent(incident::setCreatedBy);
        }
        return IncidentResponse.from(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse update(Long id, IncidentRequest request) {
        Incident incident = getIncidentOrThrow(id);
        requireNotClosed(incident);
        applyRequest(incident, request);
        return IncidentResponse.from(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse start(Long id) {
        Incident incident = getIncidentOrThrow(id);
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Cannot start a closed incident");
        }
        if (incident.getStatus() == IncidentStatus.ACTIVE) {
            throw ApiException.badRequest("Incident is already active");
        }
        incident.setStatus(IncidentStatus.ACTIVE);
        if (incident.getActualStartTime() == null) {
            incident.setActualStartTime(Instant.now());
        }
        return IncidentResponse.from(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse end(Long id) {
        Incident incident = getIncidentOrThrow(id);
        requireNotClosed(incident);
        incident.setStatus(IncidentStatus.CLOSED);
        if (incident.getActualEndTime() == null) {
            incident.setActualEndTime(Instant.now());
        }
        incident = incidentRepository.save(incident);
        operatorCheckInService.checkOutAllOpen(id);
        resourceCheckInService.checkOutAllOpen(id);
        return IncidentResponse.from(incident);
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    Incident getIncidentOrThrow(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + id));
    }

    static void requireNotClosed(Incident incident) {
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Incident is closed — no further changes can be made");
        }
    }

    private void applyRequest(Incident incident, IncidentRequest request) {
        incident.setName(request.name());
        incident.setLocation(request.location());
        incident.setPlannedStartTime(request.plannedStartTime());
        incident.setPlannedEndTime(request.plannedEndTime());
        incident.setDescription(request.description());
    }
}
