package org.nj2pc.oem.resource;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceTypeFieldRepository extends JpaRepository<ResourceTypeField, Long> {
    boolean existsByResourceTypeIdAndNameIgnoreCase(Long resourceTypeId, String name);

    int countByResourceTypeId(Long resourceTypeId);
}
