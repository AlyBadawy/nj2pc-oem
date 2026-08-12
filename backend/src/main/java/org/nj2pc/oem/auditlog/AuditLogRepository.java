package org.nj2pc.oem.auditlog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, Long> {

    List<AuditLogEntry> findAllByOrderByPerformedAtDesc();

    List<AuditLogEntry> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(EntityType entityType, Long entityId);
}
