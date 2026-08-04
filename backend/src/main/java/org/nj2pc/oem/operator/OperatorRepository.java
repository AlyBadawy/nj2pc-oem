package org.nj2pc.oem.operator;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OperatorRepository extends JpaRepository<Operator, Long> {
    boolean existsByCallsign(String callsign);
}
