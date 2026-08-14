package org.nj2pc.oem.incident;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.checkin.OperatorCheckInRepository;
import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInService;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final OperatorRepository operatorRepository;
    private final OperatorCheckInRepository operatorCheckInRepository;
    private final OperatorCheckInService operatorCheckInService;
    private final ResourceCheckInService resourceCheckInService;
    private final IncidentPermissionGrantRepository incidentPermissionGrantRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public IncidentService(IncidentRepository incidentRepository,
                            OperatorRepository operatorRepository,
                            OperatorCheckInRepository operatorCheckInRepository,
                            OperatorCheckInService operatorCheckInService,
                            ResourceCheckInService resourceCheckInService,
                            IncidentPermissionGrantRepository incidentPermissionGrantRepository,
                            PermissionGuard permissionGuard,
                            AuditLogService auditLogService) {
        this.incidentRepository = incidentRepository;
        this.operatorRepository = operatorRepository;
        this.operatorCheckInRepository = operatorCheckInRepository;
        this.operatorCheckInService = operatorCheckInService;
        this.resourceCheckInService = resourceCheckInService;
        this.incidentPermissionGrantRepository = incidentPermissionGrantRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> findAll(Authentication authentication) {
        List<Incident> incidents = incidentRepository.findAll();
        Operator caller = permissionGuard.requireCaller(authentication);
        if (permissionGuard.has(authentication, Permission.INCIDENT_VIEW_ALL) || isAdmin(authentication)) {
            return incidents.stream()
                    .map(i -> IncidentResponse.from(i, canEdit(authentication, caller, i.getId())))
                    .toList();
        }
        return incidents.stream()
                .filter(i -> canView(caller, i.getId()))
                .map(i -> IncidentResponse.from(i, canEdit(authentication, caller, i.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public IncidentResponse findById(Authentication authentication, Long id) {
        Incident incident = getIncidentOrThrow(id);
        Operator caller = permissionGuard.requireCaller(authentication);
        if (permissionGuard.has(authentication, Permission.INCIDENT_VIEW_ALL) || isAdmin(authentication)) {
            return IncidentResponse.from(incident, canEdit(authentication, caller, id));
        }
        if (!canView(caller, id)) {
            throw ApiException.forbidden("You do not have permission to view this incident");
        }
        return IncidentResponse.from(incident, canEdit(authentication, caller, id));
    }

    @Transactional
    public IncidentResponse create(Authentication authentication, IncidentRequest request) {
        permissionGuard.require(authentication, Permission.INCIDENT_CREATE);
        Incident incident = new Incident();
        applyRequest(incident, request);
        String creatorCallsign = authentication.getName();
        operatorRepository.findByCallsignIgnoreCase(creatorCallsign).ifPresent(incident::setCreatedBy);
        incident = incidentRepository.save(incident);
        auditLogService.record(EntityType.INCIDENT, incident.getId(), "CREATE",
                "Created incident " + incident.getName(), creatorCallsign);
        return IncidentResponse.from(incident, true);
    }

    @Transactional
    public IncidentResponse update(Authentication authentication, Long id, IncidentRequest request) {
        Incident incident = getIncidentOrThrow(id);
        requireEditAccess(authentication, id);
        requireNotClosed(incident);
        applyRequest(incident, request);
        incident = incidentRepository.save(incident);
        auditLogService.record(EntityType.INCIDENT, incident.getId(), "UPDATE",
                "Updated incident " + incident.getName(), authentication.getName());
        return IncidentResponse.from(incident, true);
    }

    @Transactional
    public IncidentResponse start(Authentication authentication, Long id) {
        Incident incident = getIncidentOrThrow(id);
        requireEditAccess(authentication, id);
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Cannot start a closed incident");
        }
        if (incident.getStatus() == IncidentStatus.ACTIVE) {
            throw ApiException.badRequest("Incident is already active");
        }
        incident.setStatus(IncidentStatus.ACTIVE);
        if (incident.getActualStartTime() == null) {
            incident.setActualStartTime(Instant.now());
        }
        incident = incidentRepository.save(incident);
        auditLogService.record(EntityType.INCIDENT, incident.getId(), "START",
                "Started incident " + incident.getName(), authentication.getName());
        return IncidentResponse.from(incident, true);
    }

    @Transactional
    public IncidentResponse end(Authentication authentication, Long id) {
        Incident incident = getIncidentOrThrow(id);
        requireEditAccess(authentication, id);
        requireNotClosed(incident);
        incident.setStatus(IncidentStatus.CLOSED);
        if (incident.getActualEndTime() == null) {
            incident.setActualEndTime(Instant.now());
        }
        incident = incidentRepository.save(incident);
        operatorCheckInService.checkOutAllOpen(id);
        resourceCheckInService.checkOutAllOpen(id);
        auditLogService.record(EntityType.INCIDENT, incident.getId(), "END",
                "Ended incident " + incident.getName(), authentication.getName());
        return IncidentResponse.from(incident, true);
    }

    @Transactional(readOnly = true)
    public List<IncidentPermissionGrantResponse> findPermissions(Authentication authentication, Long id) {
        getIncidentOrThrow(id);
        requireEditAccess(authentication, id);
        return incidentPermissionGrantRepository.findByIncidentId(id).stream()
                .map(IncidentPermissionGrantResponse::from).toList();
    }

    @Transactional
    public List<IncidentPermissionGrantResponse> updatePermissions(Authentication authentication, Long id,
                                                                      IncidentPermissionsRequest request) {
        Incident incident = getIncidentOrThrow(id);
        requireEditAccess(authentication, id);

        incidentPermissionGrantRepository.deleteByIncidentId(id);
        List<IncidentPermissionGrant> grants = request.grants().stream().map(g -> {
            Operator operator = operatorRepository.findById(g.operatorId())
                    .orElseThrow(() -> ApiException.notFound("Operator not found: " + g.operatorId()));
            IncidentPermissionGrant grant = new IncidentPermissionGrant();
            grant.setIncident(incident);
            grant.setOperator(operator);
            grant.setPermission(g.permission());
            return grant;
        }).toList();
        List<IncidentPermissionGrant> saved = incidentPermissionGrantRepository.saveAll(grants);

        auditLogService.record(EntityType.INCIDENT, id, "PERMISSION_GRANT",
                "Set incident permission grants for " + incident.getName() + " (" + saved.size() + " grant(s))",
                authentication.getName());
        return saved.stream().map(IncidentPermissionGrantResponse::from).toList();
    }

    /**
     * Whether the caller can edit this specific incident: admin, INCIDENT_EDIT_ALL, or an explicit
     * per-incident EDIT grant. Used both to gate mutations and to check-in/out operators on an incident.
     */
    @Transactional(readOnly = true)
    public void requireEditAccess(Authentication authentication, Long incidentId) {
        if (isAdmin(authentication) || permissionGuard.has(authentication, Permission.INCIDENT_EDIT_ALL)) {
            return;
        }
        Operator caller = permissionGuard.requireCaller(authentication);
        if (!incidentPermissionGrantRepository
                .existsByIncidentIdAndOperatorIdAndPermission(incidentId, caller.getId(), IncidentPermission.EDIT)) {
            throw ApiException.forbidden("You do not have permission to edit this incident");
        }
    }

    private boolean canView(Operator caller, Long incidentId) {
        return incidentPermissionGrantRepository
                .existsByIncidentIdAndOperatorIdAndPermission(incidentId, caller.getId(), IncidentPermission.VIEW)
                || operatorCheckInRepository.existsByIncidentIdAndOperatorIdAndCheckedOutAtIsNull(incidentId, caller.getId());
    }

    private boolean canEdit(Authentication authentication, Operator caller, Long incidentId) {
        if (isAdmin(authentication) || permissionGuard.has(authentication, Permission.INCIDENT_EDIT_ALL)) {
            return true;
        }
        return incidentPermissionGrantRepository
                .existsByIncidentIdAndOperatorIdAndPermission(incidentId, caller.getId(), IncidentPermission.EDIT);
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    Incident getIncidentOrThrow(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + id));
    }

    static void requireNotClosed(Incident incident) {
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Incident is closed — no further changes can be made");
        }
    }

    private void applyRequest(Incident incident, IncidentRequest request) {
        incident.setName(request.name());
        incident.setLocation(request.location());
        incident.setPlannedStartTime(request.plannedStartTime());
        incident.setPlannedEndTime(request.plannedEndTime());
        incident.setDescription(request.description());
        incident.setLatitude(request.latitude());
        incident.setLongitude(request.longitude());
    }
}
