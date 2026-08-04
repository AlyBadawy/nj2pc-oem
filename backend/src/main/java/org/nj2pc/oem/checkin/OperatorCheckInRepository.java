package org.nj2pc.oem.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OperatorCheckInRepository extends JpaRepository<OperatorCheckIn, Long> {
    List<OperatorCheckIn> findByIncidentIdOrderByCheckedInAtDesc(Long incidentId);

    List<OperatorCheckIn> findByIncidentIdAndCheckedOutAtIsNull(Long incidentId);

    Optional<OperatorCheckIn> findByIncidentIdAndOperatorIdAndCheckedOutAtIsNull(Long incidentId, Long operatorId);
}
