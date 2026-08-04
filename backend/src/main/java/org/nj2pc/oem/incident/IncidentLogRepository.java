package org.nj2pc.oem.incident;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentLogRepository extends JpaRepository<IncidentLog, Long> {
    List<IncidentLog> findByIncidentIdOrderByLoggedAtAsc(Long incidentId);
}
