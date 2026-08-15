package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class IncidentCommsPlanApplicationService {

    private final IncidentCommsPlanApplicationRepository applicationRepository;
    private final IncidentRepository incidentRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;
    private final CommunicationPlanService communicationPlanService;

    public IncidentCommsPlanApplicationService(IncidentCommsPlanApplicationRepository applicationRepository,
                                                IncidentRepository incidentRepository,
                                                PermissionGuard permissionGuard,
                                                AuditLogService auditLogService,
                                                CommunicationPlanService communicationPlanService) {
        this.applicationRepository = applicationRepository;
        this.incidentRepository = incidentRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
        this.communicationPlanService = communicationPlanService;
    }

    @Transactional(readOnly = true)
    public List<IncidentCommsPlanApplicationResponse> findHistory(Long incidentId) {
        return applicationRepository.findByIncidentIdOrderByAppliedAtDesc(incidentId).stream()
                .map(IncidentCommsPlanApplicationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Optional<IncidentCommsPlanApplicationResponse> findActive(Long incidentId) {
        return applicationRepository.findByIncidentIdAndRevokedAtIsNull(incidentId)
                .map(IncidentCommsPlanApplicationResponse::from);
    }

    @Transactional
    public IncidentCommsPlanApplicationResponse apply(Authentication authentication, Long incidentId,
                                                        ApplyCommsPlanRequest request) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        Operator caller = permissionGuard.requireCaller(authentication);

        applicationRepository.findByIncidentIdAndRevokedAtIsNull(incidentId).ifPresent(current -> {
            current.setRevokedAt(Instant.now());
            current.setRevokedBy(caller);
            // Flush immediately: within a single flush, Hibernate always executes inserts before
            // updates regardless of call order. Without this, the new application row inserted
            // below would hit the database before this row's revoked_at UPDATE, momentarily
            // leaving two rows with revoked_at IS NULL for the same incident and violating the
            // partial unique index uq_incident_comms_plan_active.
            applicationRepository.saveAndFlush(current);
        });

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        CommunicationPlan plan = communicationPlanService.getPlanOrThrow(request.communicationPlanId());

        IncidentCommsPlanApplication application = new IncidentCommsPlanApplication();
        application.setIncident(incident);
        application.setCommunicationPlan(plan);
        application.setAppliedBy(caller);
        application = applicationRepository.save(application);

        auditLogService.record(EntityType.INCIDENT, incidentId, "COMMS_PLAN_APPLY",
                "Applied communications plan " + plan.getName() + " v" + plan.getVersion() + " to incident",
                authentication.getName());

        return IncidentCommsPlanApplicationResponse.from(application);
    }

    @Transactional
    public IncidentCommsPlanApplicationResponse revoke(Authentication authentication, Long incidentId, Long applicationId) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        Operator caller = permissionGuard.requireCaller(authentication);

        IncidentCommsPlanApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Application not found: " + applicationId));
        if (!application.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Application not found on incident " + incidentId + ": " + applicationId);
        }
        if (application.getRevokedAt() != null) {
            throw ApiException.badRequest("This application has already been revoked");
        }

        application.setRevokedAt(Instant.now());
        application.setRevokedBy(caller);
        application = applicationRepository.save(application);

        auditLogService.record(EntityType.INCIDENT, incidentId, "COMMS_PLAN_REVOKE",
                "Revoked communications plan " + application.getCommunicationPlan().getName() + " from incident",
                authentication.getName());

        return IncidentCommsPlanApplicationResponse.from(application);
    }
}
