package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommunicationChannelService {

    private final CommunicationChannelRepository communicationChannelRepository;
    private final CommunicationPlanService communicationPlanService;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public CommunicationChannelService(CommunicationChannelRepository communicationChannelRepository,
                                        CommunicationPlanService communicationPlanService,
                                        PermissionGuard permissionGuard,
                                        AuditLogService auditLogService) {
        this.communicationChannelRepository = communicationChannelRepository;
        this.communicationPlanService = communicationPlanService;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    public List<CommunicationChannelResponse> findByPlan(Long planId) {
        communicationPlanService.getPlanOrThrow(planId);
        return communicationChannelRepository.findByPlanIdOrderByChannelNumberAsc(planId).stream()
                .map(CommunicationChannelResponse::from).toList();
    }

    @Transactional
    public CommunicationChannelResponse create(Authentication authentication, Long planId, CommunicationChannelRequest request) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationPlan plan = communicationPlanService.getPlanOrThrow(planId);
        CommunicationChannel channel = new CommunicationChannel();
        channel.setPlan(plan);
        applyRequest(channel, request);
        channel = communicationChannelRepository.save(channel);
        auditLogService.record(EntityType.COMMS_PLAN, planId, "CHANNEL_ADD",
                "Added channel " + channel.getChannelName() + " to " + plan.getName(), authentication.getName());
        return CommunicationChannelResponse.from(channel);
    }

    @Transactional
    public CommunicationChannelResponse update(Authentication authentication, Long planId, Long channelId,
                                                CommunicationChannelRequest request) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationChannel channel = getChannelOrThrow(planId, channelId);
        applyRequest(channel, request);
        channel = communicationChannelRepository.save(channel);
        auditLogService.record(EntityType.COMMS_PLAN, planId, "CHANNEL_UPDATE",
                "Updated channel " + channel.getChannelName(), authentication.getName());
        return CommunicationChannelResponse.from(channel);
    }

    @Transactional
    public void delete(Authentication authentication, Long planId, Long channelId) {
        permissionGuard.require(authentication, Permission.COMMS_PLAN_MANAGE);
        CommunicationChannel channel = getChannelOrThrow(planId, channelId);
        communicationChannelRepository.delete(channel);
        auditLogService.record(EntityType.COMMS_PLAN, planId, "CHANNEL_DELETE",
                "Removed channel " + channel.getChannelName(), authentication.getName());
    }

    private CommunicationChannel getChannelOrThrow(Long planId, Long channelId) {
        CommunicationChannel channel = communicationChannelRepository.findById(channelId)
                .orElseThrow(() -> ApiException.notFound("Channel not found: " + channelId));
        if (!channel.getPlan().getId().equals(planId)) {
            throw ApiException.notFound("Channel not found on plan " + planId + ": " + channelId);
        }
        return channel;
    }

    private void applyRequest(CommunicationChannel channel, CommunicationChannelRequest request) {
        channel.setZoneGroup(request.zoneGroup());
        channel.setChannelNumber(request.channelNumber());
        channel.setFunction(request.function());
        channel.setChannelName(request.channelName());
        channel.setAssignment(request.assignment());
        channel.setRxFrequency(request.rxFrequency());
        channel.setRxTone(request.rxTone());
        channel.setTxFrequency(request.txFrequency());
        channel.setTxTone(request.txTone());
        channel.setMode(request.mode());
        channel.setRemarks(request.remarks());
    }
}
