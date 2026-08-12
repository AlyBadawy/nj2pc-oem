package org.nj2pc.oem.auditlog;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-log")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AuditLogEntryResponse> find(Authentication authentication,
                                             @RequestParam(required = false) EntityType entityType,
                                             @RequestParam(required = false) Long entityId) {
        return auditLogService.find(authentication, entityType, entityId);
    }
}
