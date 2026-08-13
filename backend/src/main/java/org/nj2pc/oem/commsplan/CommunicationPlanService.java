package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommunicationPlanService {

    private final CommunicationPlanRepository communicationPlanRepository;
    private final CommunicationChannelRepository communicationChannelRepository;
    private final IncidentRepository incidentRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public CommunicationPlanService(CommunicationPlanRepository communicationPlanRepository,
                                     CommunicationChannelRepository communicationChannelRepository,
                                     IncidentRepository incidentRepository,
                                     PermissionGuard permissionGuard,
                                     AuditLogService auditLogService) {
        this.communicationPlanRepository = communicationPlanRepository;
        this.communicationChannelRepository = communicationChannelRepository;
        this.incidentRepository = incidentRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findAll() {
        return communicationPlanRepository.findAll().stream().map(CommunicationPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findAll(boolean activeOnly) {
        if (!activeOnly) {
            return findAll();
        }
        return communicationPlanRepository.findByActiveTrue().stream().map(CommunicationPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return communicationPlanRepository.findByIncidents_Id(incidentId).stream()
                .map(CommunicationPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CommunicationPlanResponse findById(Long id) {
        return CommunicationPlanResponse.from(getPlanOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findVersions(Long id) {
        CommunicationPlan plan = getPlanOrThrow(id);
        Long rootId = plan.getRootPlanId() != null ? plan.getRootPlanId() : plan.getId();
        return communicationPlanRepository.findAllVersions(rootId).stream()
                .map(CommunicationPlanResponse::from).toList();
    }

    @Transactional
    public CommunicationPlanResponse create(Authentication authentication, CommunicationPlanRequest request) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan plan = new CommunicationPlan();
        applyRequest(plan, request);
        plan = communicationPlanRepository.save(plan);
        auditLogService.record(EntityType.COMMS_PLAN, plan.getId(), "CREATE",
                "Created communications plan " + plan.getName(), authentication.getName());
        return CommunicationPlanResponse.from(plan);
    }

    @Transactional
    public CommunicationPlanResponse update(Authentication authentication, Long id, CommunicationPlanRequest request) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan old = getPlanOrThrow(id);

        CommunicationPlan next = new CommunicationPlan();
        applyRequest(next, request);
        next.setRootPlanId(old.getRootPlanId() != null ? old.getRootPlanId() : old.getId());
        next.setVersion(old.getVersion() + 1);
        next.setActive(true);
        next = communicationPlanRepository.save(next);

        for (CommunicationChannel oldChannel : communicationChannelRepository.findByPlanIdOrderByChannelNumberAsc(old.getId())) {
            CommunicationChannel newChannel = new CommunicationChannel();
            newChannel.setPlan(next);
            newChannel.setZoneGroup(oldChannel.getZoneGroup());
            newChannel.setChannelNumber(oldChannel.getChannelNumber());
            newChannel.setFunction(oldChannel.getFunction());
            newChannel.setChannelName(oldChannel.getChannelName());
            newChannel.setAssignment(oldChannel.getAssignment());
            newChannel.setRxFrequency(oldChannel.getRxFrequency());
            newChannel.setRxTone(oldChannel.getRxTone());
            newChannel.setTxFrequency(oldChannel.getTxFrequency());
            newChannel.setTxTone(oldChannel.getTxTone());
            newChannel.setMode(oldChannel.getMode());
            newChannel.setRemarks(oldChannel.getRemarks());
            communicationChannelRepository.save(newChannel);
        }

        old.setActive(false);
        communicationPlanRepository.save(old);

        auditLogService.record(EntityType.COMMS_PLAN, next.getId(), "NEW_VERSION",
                "Created version " + next.getVersion() + " of " + next.getName(), authentication.getName());
        return CommunicationPlanResponse.from(next);
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan plan = getPlanOrThrow(id);
        communicationPlanRepository.delete(plan);
        auditLogService.record(EntityType.COMMS_PLAN, id, "DELETE",
                "Deleted communications plan " + plan.getName(), authentication.getName());
    }

    @Transactional
    public CommunicationPlanResponse linkIncident(Authentication authentication, Long planId, Long incidentId) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan plan = getPlanOrThrow(planId);
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        plan.getIncidents().add(incident);
        plan = communicationPlanRepository.save(plan);
        auditLogService.record(EntityType.COMMS_PLAN, plan.getId(), "LINK_INCIDENT",
                "Linked incident " + incident.getName() + " to " + plan.getName(), authentication.getName());
        return CommunicationPlanResponse.from(plan);
    }

    @Transactional
    public CommunicationPlanResponse unlinkIncident(Authentication authentication, Long planId, Long incidentId) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan plan = getPlanOrThrow(planId);
        plan.getIncidents().removeIf(i -> i.getId().equals(incidentId));
        plan = communicationPlanRepository.save(plan);
        auditLogService.record(EntityType.COMMS_PLAN, plan.getId(), "UNLINK_INCIDENT",
                "Unlinked incident " + incidentId + " from " + plan.getName(), authentication.getName());
        return CommunicationPlanResponse.from(plan);
    }

    CommunicationPlan getPlanOrThrow(Long id) {
        return communicationPlanRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Communication plan not found: " + id));
    }

    private void applyRequest(CommunicationPlan plan, CommunicationPlanRequest request) {
        plan.setName(request.name());
        plan.setOperationalPeriodStart(request.operationalPeriodStart());
        plan.setOperationalPeriodEnd(request.operationalPeriodEnd());
        plan.setSpecialInstructions(request.specialInstructions());
        plan.setPreparedByName(request.preparedByName());
        plan.setPreparedByCallsign(request.preparedByCallsign());
        plan.setPreparedAt(request.preparedAt());
        plan.setApprovedByName(request.approvedByName());
        plan.setApprovedByCallsign(request.approvedByCallsign());
        plan.setApprovedAt(request.approvedAt());
    }
}
