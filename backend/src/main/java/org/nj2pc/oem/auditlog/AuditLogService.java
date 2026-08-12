package org.nj2pc.oem.auditlog;

import jakarta.servlet.http.HttpServletRequest;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final OperatorRepository operatorRepository;
    private final PermissionGuard permissionGuard;
    private final HttpServletRequest httpServletRequest;

    public AuditLogService(AuditLogRepository auditLogRepository, OperatorRepository operatorRepository,
                            PermissionGuard permissionGuard, HttpServletRequest httpServletRequest) {
        this.auditLogRepository = auditLogRepository;
        this.operatorRepository = operatorRepository;
        this.permissionGuard = permissionGuard;
        this.httpServletRequest = httpServletRequest;
    }

    @Transactional
    public void record(EntityType entityType, Long entityId, String action, String summary, String actorCallsign) {
        AuditLogEntry entry = new AuditLogEntry();
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setAction(action);
        entry.setSummary(summary);
        entry.setPerformedIp(currentIp());
        if (actorCallsign != null) {
            operatorRepository.findByCallsignIgnoreCase(actorCallsign).ifPresent(entry::setPerformedBy);
        }
        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<AuditLogEntryResponse> find(Authentication authentication, EntityType entityType, Long entityId) {
        permissionGuard.require(authentication, Permission.LOG_VIEW);
        List<AuditLogEntry> entries = entityType != null && entityId != null
                ? auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(entityType, entityId)
                : auditLogRepository.findAllByOrderByPerformedAtDesc();
        return entries.stream().map(AuditLogEntryResponse::from).toList();
    }

    private String currentIp() {
        String forwardedFor = httpServletRequest.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = httpServletRequest.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return httpServletRequest.getRemoteAddr();
    }
}
