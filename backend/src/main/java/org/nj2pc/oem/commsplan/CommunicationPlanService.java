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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CommunicationPlanService {

    /** Result of cloning a plan into a new version: the new plan row, plus a map from each old
     * channel's id to its freshly-cloned counterpart on the new plan (used by
     * {@link CommunicationChannelService} to keep editing/deleting the "same" channel across the
     * version bump it now triggers). */
    record PlanClone(CommunicationPlan plan, Map<Long, CommunicationChannel> channelMapping) {
    }

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
        PlanClone clone = cloneAsNewVersion(authentication, old);
        applyRequest(clone.plan(), request);
        CommunicationPlan next = communicationPlanRepository.save(clone.plan());
        return CommunicationPlanResponse.from(next);
    }

    /** Clones {@code old} into a new, active version (copying every channel), deactivates
     * {@code old}, and audit-logs the version bump. Any mutation to a plan's channels goes
     * through this too — the whole plan gets a new version, not just the touched channel. */
    @Transactional
    PlanClone cloneAsNewVersion(Authentication authentication, CommunicationPlan old) {
        CommunicationPlan next = new CommunicationPlan();
        copyPlanFields(next, old);
        next.setRootPlanId(old.getRootPlanId() != null ? old.getRootPlanId() : old.getId());
        next.setVersion(old.getVersion() + 1);
        next.setActive(true);
        next = communicationPlanRepository.save(next);

        Map<Long, CommunicationChannel> channelMapping = new HashMap<>();
        for (CommunicationChannel oldChannel : communicationChannelRepository.findByPlanIdOrderByChannelNumberAsc(old.getId())) {
            CommunicationChannel newChannel = new CommunicationChannel();
            newChannel.setPlan(next);
            copyChannelFields(newChannel, oldChannel);
            newChannel = communicationChannelRepository.save(newChannel);
            channelMapping.put(oldChannel.getId(), newChannel);
        }

        old.setActive(false);
        communicationPlanRepository.save(old);

        auditLogService.record(EntityType.COMMS_PLAN, next.getId(), "NEW_VERSION",
                "Created version " + next.getVersion() + " of " + next.getName(), authentication.getName());
        return new PlanClone(next, channelMapping);
    }

    private void copyPlanFields(CommunicationPlan target, CommunicationPlan source) {
        target.setName(source.getName());
        target.setOperationalPeriodStart(source.getOperationalPeriodStart());
        target.setOperationalPeriodEnd(source.getOperationalPeriodEnd());
        target.setSpecialInstructions(source.getSpecialInstructions());
        target.setPreparedByName(source.getPreparedByName());
        target.setPreparedByCallsign(source.getPreparedByCallsign());
        target.setPreparedAt(source.getPreparedAt());
        target.setApprovedByName(source.getApprovedByName());
        target.setApprovedByCallsign(source.getApprovedByCallsign());
        target.setApprovedAt(source.getApprovedAt());
    }

    private void copyChannelFields(CommunicationChannel target, CommunicationChannel source) {
        target.setZoneGroup(source.getZoneGroup());
        target.setChannelNumber(source.getChannelNumber());
        target.setFunction(source.getFunction());
        target.setChannelName(source.getChannelName());
        target.setAssignment(source.getAssignment());
        target.setRxFrequency(source.getRxFrequency());
        target.setRxTone(source.getRxTone());
        target.setTxFrequency(source.getTxFrequency());
        target.setTxTone(source.getTxTone());
        target.setMode(source.getMode());
        target.setRemarks(source.getRemarks());
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
