package org.nj2pc.oem.checkin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ResourceCheckInRepository extends JpaRepository<ResourceCheckIn, Long> {
    List<ResourceCheckIn> findByIncidentIdOrderByCheckedInAtDesc(Long incidentId);

    List<ResourceCheckIn> findByIncidentIdAndCheckedOutAtIsNull(Long incidentId);

    Optional<ResourceCheckIn> findByIncidentIdAndResourceIdAndCheckedOutAtIsNull(Long incidentId, Long resourceId);

    Optional<ResourceCheckIn> findFirstByResourceIdAndLatitudeIsNotNullOrderByCheckedInAtDesc(Long resourceId);

    long countByDeploymentLocationIdAndCheckedOutAtIsNull(Long deploymentLocationId);

    /** One row per check-in that has a deployment location, newest first — the all-resources
     * inventory list picks the first row per resource id to show each item's most recent
     * deployment location without an N+1 lazy-load per row (a plain projection of the three
     * scalars needed, not the full entity graph). */
    @Query("SELECT c.resource.id, c.deploymentLocation.name, c.checkedInAt FROM ResourceCheckIn c " +
            "WHERE c.deploymentLocation IS NOT NULL ORDER BY c.checkedInAt DESC")
    List<Object[]> findLastDeploymentLocationRows();
}
