package org.nj2pc.oem.operator;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OperatorRepository extends JpaRepository<Operator, Long> {
    boolean existsByCallsignIgnoreCase(String callsign);

    Optional<Operator> findByCallsignIgnoreCase(String callsign);
}
