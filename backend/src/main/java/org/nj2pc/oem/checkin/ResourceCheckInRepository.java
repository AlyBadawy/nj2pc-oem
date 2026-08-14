package org.nj2pc.oem.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResourceCheckInRepository extends JpaRepository<ResourceCheckIn, Long> {
    List<ResourceCheckIn> findByIncidentIdOrderByCheckedInAtDesc(Long incidentId);

    List<ResourceCheckIn> findByIncidentIdAndCheckedOutAtIsNull(Long incidentId);

    Optional<ResourceCheckIn> findByIncidentIdAndResourceIdAndCheckedOutAtIsNull(Long incidentId, Long resourceId);

    Optional<ResourceCheckIn> findFirstByResourceIdAndLatitudeIsNotNullOrderByCheckedInAtDesc(Long resourceId);

    long countByDeploymentLocationIdAndCheckedOutAtIsNull(Long deploymentLocationId);
}
