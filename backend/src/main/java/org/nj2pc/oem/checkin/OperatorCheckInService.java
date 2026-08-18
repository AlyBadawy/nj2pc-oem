package org.nj2pc.oem.checkin;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentPermission;
import org.nj2pc.oem.incident.IncidentPermissionGrantRepository;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.incident.IncidentStatus;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class OperatorCheckInService {

    private final OperatorCheckInRepository operatorCheckInRepository;
    private final IncidentRepository incidentRepository;
    private final OperatorRepository operatorRepository;
    private final OperatorRoleRepository operatorRoleRepository;
    private final AuditLogService auditLogService;
    private final IncidentPermissionGrantRepository incidentPermissionGrantRepository;
    private final PermissionGuard permissionGuard;

    public OperatorCheckInService(OperatorCheckInRepository operatorCheckInRepository,
                                   IncidentRepository incidentRepository,
                                   OperatorRepository operatorRepository,
                                   OperatorRoleRepository operatorRoleRepository,
                                   AuditLogService auditLogService,
                                   IncidentPermissionGrantRepository incidentPermissionGrantRepository,
                                   PermissionGuard permissionGuard) {
        this.operatorCheckInRepository = operatorCheckInRepository;
        this.incidentRepository = incidentRepository;
        this.operatorRepository = operatorRepository;
        this.operatorRoleRepository = operatorRoleRepository;
        this.auditLogService = auditLogService;
        this.incidentPermissionGrantRepository = incidentPermissionGrantRepository;
        this.permissionGuard = permissionGuard;
    }

    @Transactional(readOnly = true)
    public List<OperatorCheckInResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return operatorCheckInRepository.findByIncidentIdOrderByCheckedInAtDesc(incidentId).stream()
                .map(OperatorCheckInResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OperatorCheckInResponse> findAllOpen() {
        return operatorCheckInRepository.findByCheckedOutAtIsNull().stream()
                .map(OperatorCheckInResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Optional<LastRoleResponse> findLastRole(Long operatorId) {
        return operatorCheckInRepository.findTopByOperatorIdAndRoleIsNotNullOrderByCheckedInAtDesc(operatorId)
                .map(c -> new LastRoleResponse(c.getRole().getId(), c.getRole().getName()));
    }

    @Transactional
    public OperatorCheckInResponse checkIn(Authentication authentication, Long incidentId, OperatorCheckInRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Cannot check in to a closed incident");
        }
        Operator operator = operatorRepository.findById(request.operatorId())
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.operatorId()));

        operatorCheckInRepository.findByIncidentIdAndOperatorIdAndCheckedOutAtIsNull(incidentId, request.operatorId())
                .ifPresent(existing -> {
                    throw ApiException.conflict(operator.getCallsign() + " is already checked in to this incident");
                });

        OperatorCheckIn checkIn = new OperatorCheckIn();
        checkIn.setIncident(incident);
        checkIn.setOperator(operator);
        checkIn.setCheckedInAt(request.checkedInAt() != null ? request.checkedInAt() : Instant.now());
        if (request.roleId() != null) {
            OperatorRole role = operatorRoleRepository.findById(request.roleId())
                    .orElseThrow(() -> ApiException.notFound("Role not found: " + request.roleId()));
            checkIn.setRole(role);
        }
        checkIn.setPost(request.post());
        checkIn.setNotes(request.notes());
        OperatorCheckInResponse response = OperatorCheckInResponse.from(operatorCheckInRepository.save(checkIn));
        auditLogService.record(EntityType.INCIDENT, incidentId, "CHECK_IN",
                "Checked in operator " + operator.getCallsign(), authentication.getName());
        return response;
    }

    @Transactional
    public OperatorCheckInResponse checkOut(Authentication authentication, Long incidentId, Long checkInId,
                                             OperatorCheckOutRequest request) {
        OperatorCheckIn checkIn = getCheckInOrThrow(incidentId, checkInId);
        if (!canEditIncident(authentication, incidentId)) {
            Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName())
                    .orElseThrow(() -> ApiException.forbidden("You may only check yourself out"));
            if (!checkIn.getOperator().getId().equals(caller.getId())) {
                throw ApiException.forbidden("You may only check yourself out");
            }
        }
        if (checkIn.getCheckedOutAt() != null) {
            throw ApiException.badRequest("Already checked out");
        }
        Instant checkedOutAt = request != null && request.checkedOutAt() != null ? request.checkedOutAt() : Instant.now();
        if (checkedOutAt.isBefore(checkIn.getCheckedInAt())) {
            throw ApiException.badRequest("Checked-out time cannot be before checked-in time");
        }
        checkIn.setCheckedOutAt(checkedOutAt);
        OperatorCheckInResponse response = OperatorCheckInResponse.from(operatorCheckInRepository.save(checkIn));
        auditLogService.record(EntityType.INCIDENT, incidentId, "CHECK_OUT",
                "Checked out operator " + checkIn.getOperator().getCallsign(), authentication.getName());
        return response;
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    private boolean canEditIncident(Authentication authentication, Long incidentId) {
        if (isAdmin(authentication) || permissionGuard.has(authentication, Permission.INCIDENT_EDIT_ALL)) {
            return true;
        }
        Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName()).orElse(null);
        return caller != null && incidentPermissionGrantRepository
                .existsByIncidentIdAndOperatorIdAndPermission(incidentId, caller.getId(), IncidentPermission.EDIT);
    }

    @Transactional
    public void checkOutAllOpen(Long incidentId) {
        Instant now = Instant.now();
        List<OperatorCheckIn> open = operatorCheckInRepository.findByIncidentIdAndCheckedOutAtIsNull(incidentId);
        open.forEach(c -> c.setCheckedOutAt(now));
        operatorCheckInRepository.saveAll(open);
    }

    private OperatorCheckIn getCheckInOrThrow(Long incidentId, Long checkInId) {
        OperatorCheckIn checkIn = operatorCheckInRepository.findById(checkInId)
                .orElseThrow(() -> ApiException.notFound("Check-in not found: " + checkInId));
        if (!checkIn.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Check-in not found on incident " + incidentId + ": " + checkInId);
        }
        return checkIn;
    }
}
