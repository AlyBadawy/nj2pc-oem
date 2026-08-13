package org.nj2pc.oem.commsplan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunicationPlanRepository extends JpaRepository<CommunicationPlan, Long> {
    List<CommunicationPlan> findByIncidents_Id(Long incidentId);

    List<CommunicationPlan> findByActiveTrue();

    @Query("select p from CommunicationPlan p where p.id = :rootId or p.rootPlanId = :rootId order by p.version desc")
    List<CommunicationPlan> findAllVersions(@Param("rootId") Long rootId);
}
