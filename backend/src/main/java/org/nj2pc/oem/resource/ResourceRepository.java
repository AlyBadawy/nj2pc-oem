package org.nj2pc.oem.resource;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    Optional<Resource> findByIdentifierIgnoreCase(String identifier);
}
