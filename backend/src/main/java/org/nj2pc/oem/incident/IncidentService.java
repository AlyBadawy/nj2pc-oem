package org.nj2pc.oem.incident;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;

    public IncidentService(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public List<IncidentResponse> findAll() {
        return incidentRepository.findAll().stream().map(IncidentResponse::from).toList();
    }

    public IncidentResponse findById(Long id) {
        return IncidentResponse.from(getIncidentOrThrow(id));
    }

    @Transactional
    public IncidentResponse create(IncidentRequest request) {
        Incident incident = new Incident();
        applyRequest(incident, request);
        return IncidentResponse.from(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse update(Long id, IncidentRequest request) {
        Incident incident = getIncidentOrThrow(id);
        applyRequest(incident, request);
        return IncidentResponse.from(incidentRepository.save(incident));
    }

    @Transactional
    public void delete(Long id) {
        if (!incidentRepository.existsById(id)) {
            throw ApiException.notFound("Incident not found: " + id);
        }
        incidentRepository.deleteById(id);
    }

    Incident getIncidentOrThrow(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + id));
    }

    private void applyRequest(Incident incident, IncidentRequest request) {
        incident.setName(request.name());
        incident.setLocation(request.location());
        incident.setStatus(request.status());
        incident.setStartTime(request.startTime());
        incident.setEndTime(request.endTime());
        incident.setDescription(request.description());
    }
}
