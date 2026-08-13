package org.nj2pc.oem.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IncidentPermissionGrantRepository extends JpaRepository<IncidentPermissionGrant, Long> {

    boolean existsByIncidentIdAndOperatorIdAndPermission(Long incidentId, Long operatorId, IncidentPermission permission);

    List<IncidentPermissionGrant> findByIncidentId(Long incidentId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from IncidentPermissionGrant g where g.incident.id = :incidentId")
    void deleteByIncidentId(@Param("incidentId") Long incidentId);
}
