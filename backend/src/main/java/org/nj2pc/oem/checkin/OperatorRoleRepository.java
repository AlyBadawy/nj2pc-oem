package org.nj2pc.oem.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OperatorRoleRepository extends JpaRepository<OperatorRole, Long> {
    boolean existsByNameIgnoreCase(String name);
}
