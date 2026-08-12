package org.nj2pc.oem.incident;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentPermissionGrantRepository extends JpaRepository<IncidentPermissionGrant, Long> {

    boolean existsByIncidentIdAndOperatorIdAndPermission(Long incidentId, Long operatorId, IncidentPermission permission);

    List<IncidentPermissionGrant> findByIncidentId(Long incidentId);

    void deleteByIncidentId(Long incidentId);
}
