package org.nj2pc.oem.resource;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceTypeRepository extends JpaRepository<ResourceType, Long> {
    boolean existsByNameIgnoreCase(String name);
}
