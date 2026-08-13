package org.nj2pc.oem.commsplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IncidentCommsPlanApplicationRepository extends JpaRepository<IncidentCommsPlanApplication, Long> {
    List<IncidentCommsPlanApplication> findByIncidentIdOrderByAppliedAtDesc(Long incidentId);

    Optional<IncidentCommsPlanApplication> findByIncidentIdAndRevokedAtIsNull(Long incidentId);
}
