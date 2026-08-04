package org.nj2pc.oem.resource;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final OperatorRepository operatorRepository;
    private final IncidentRepository incidentRepository;

    public ResourceService(ResourceRepository resourceRepository,
                            OperatorRepository operatorRepository,
                            IncidentRepository incidentRepository) {
        this.resourceRepository = resourceRepository;
        this.operatorRepository = operatorRepository;
        this.incidentRepository = incidentRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> findAll() {
        return resourceRepository.findAll().stream().map(ResourceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ResourceResponse findById(Long id) {
        return ResourceResponse.from(getResourceOrThrow(id));
    }

    @Transactional
    public ResourceResponse create(ResourceRequest request) {
        Resource resource = new Resource();
        applyRequest(resource, request);
        return ResourceResponse.from(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse update(Long id, ResourceRequest request) {
        Resource resource = getResourceOrThrow(id);
        applyRequest(resource, request);
        return ResourceResponse.from(resourceRepository.save(resource));
    }

    @Transactional
    public void delete(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw ApiException.notFound("Resource not found: " + id);
        }
        resourceRepository.deleteById(id);
    }

    private Resource getResourceOrThrow(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Resource not found: " + id));
    }

    private void applyRequest(Resource resource, ResourceRequest request) {
        resource.setType(request.type());
        resource.setIdentifier(request.identifier());
        resource.setFrequency(request.frequency());
        resource.setStatus(request.status());
        resource.setNotes(request.notes());

        if (request.assignedOperatorId() != null) {
            Operator operator = operatorRepository.findById(request.assignedOperatorId())
                    .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.assignedOperatorId()));
            resource.setAssignedOperator(operator);
        } else {
            resource.setAssignedOperator(null);
        }

        if (request.assignedIncidentId() != null) {
            Incident incident = incidentRepository.findById(request.assignedIncidentId())
                    .orElseThrow(() -> ApiException.notFound("Incident not found: " + request.assignedIncidentId()));
            resource.setAssignedIncident(incident);
        } else {
            resource.setAssignedIncident(null);
        }
    }
}
