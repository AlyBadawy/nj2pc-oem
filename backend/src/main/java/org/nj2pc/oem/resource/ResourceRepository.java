package org.nj2pc.oem.resource;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    /** `findFirst`, not `find` — identifiers aren't DB-enforced unique (see
     * ResourceService.applyRequest's application-level check), so a caller matching a scanned
     * hostname against gear must tolerate pre-existing duplicates rather than blowing up with
     * an IncorrectResultSizeDataAccessException. */
    Optional<Resource> findFirstByIdentifierIgnoreCase(String identifier);
}
