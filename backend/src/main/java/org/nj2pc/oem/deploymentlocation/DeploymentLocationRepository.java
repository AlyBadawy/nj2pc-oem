package org.nj2pc.oem.deploymentlocation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeploymentLocationRepository extends JpaRepository<DeploymentLocation, Long> {
    List<DeploymentLocation> findByIncidentIdOrderByNameAsc(Long incidentId);
}
