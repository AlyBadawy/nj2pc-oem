package org.nj2pc.oem.deploymentlocation;

import org.nj2pc.oem.checkin.ResourceCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DeploymentLocationService {

    private final DeploymentLocationRepository deploymentLocationRepository;
    private final IncidentRepository incidentRepository;
    private final ResourceCheckInRepository resourceCheckInRepository;
    private final PermissionGuard permissionGuard;

    public DeploymentLocationService(DeploymentLocationRepository deploymentLocationRepository,
                                      IncidentRepository incidentRepository,
                                      ResourceCheckInRepository resourceCheckInRepository,
                                      PermissionGuard permissionGuard) {
        this.deploymentLocationRepository = deploymentLocationRepository;
        this.incidentRepository = incidentRepository;
        this.resourceCheckInRepository = resourceCheckInRepository;
        this.permissionGuard = permissionGuard;
    }

    @Transactional(readOnly = true)
    public List<DeploymentLocationResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return deploymentLocationRepository.findByIncidentIdOrderByNameAsc(incidentId).stream()
                .map(l -> DeploymentLocationResponse.from(l,
                        resourceCheckInRepository.countByDeploymentLocationIdAndCheckedOutAtIsNull(l.getId())))
                .toList();
    }

    @Transactional
    public DeploymentLocationResponse create(Authentication authentication, Long incidentId, DeploymentLocationRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        Operator caller = permissionGuard.requireCaller(authentication);

        DeploymentLocation location = new DeploymentLocation();
        location.setIncident(incident);
        location.setName(request.name());
        location.setLatitude(request.latitude());
        location.setLongitude(request.longitude());
        location.setNotes(request.notes());
        location.setCreatedBy(caller);
        DeploymentLocation saved = deploymentLocationRepository.save(location);
        return DeploymentLocationResponse.from(saved, 0);
    }

    @Transactional
    public DeploymentLocationResponse update(Authentication authentication, Long incidentId, Long locationId,
                                              DeploymentLocationRequest request) {
        DeploymentLocation location = deploymentLocationRepository.findById(locationId)
                .orElseThrow(() -> ApiException.notFound("Deployment location not found: " + locationId));
        if (!location.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Deployment location not found: " + locationId);
        }

        location.setName(request.name());
        location.setLatitude(request.latitude());
        location.setLongitude(request.longitude());
        location.setNotes(request.notes());
        DeploymentLocation saved = deploymentLocationRepository.save(location);
        long gearCount = resourceCheckInRepository.countByDeploymentLocationIdAndCheckedOutAtIsNull(saved.getId());
        return DeploymentLocationResponse.from(saved, gearCount);
    }
}
