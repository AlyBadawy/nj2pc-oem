package org.nj2pc.oem.commsplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunicationPlanRepository extends JpaRepository<CommunicationPlan, Long> {
    List<CommunicationPlan> findByIncidents_Id(Long incidentId);
}
