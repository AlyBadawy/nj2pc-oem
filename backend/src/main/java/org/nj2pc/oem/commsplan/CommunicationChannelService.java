package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommunicationChannelService {

    private final CommunicationChannelRepository communicationChannelRepository;
    private final CommunicationPlanService communicationPlanService;

    public CommunicationChannelService(CommunicationChannelRepository communicationChannelRepository,
                                        CommunicationPlanService communicationPlanService) {
        this.communicationChannelRepository = communicationChannelRepository;
        this.communicationPlanService = communicationPlanService;
    }

    public List<CommunicationChannelResponse> findByPlan(Long planId) {
        communicationPlanService.getPlanOrThrow(planId);
        return communicationChannelRepository.findByPlanIdOrderByChannelNumberAsc(planId).stream()
                .map(CommunicationChannelResponse::from).toList();
    }

    @Transactional
    public CommunicationChannelResponse create(Long planId, CommunicationChannelRequest request) {
        CommunicationPlan plan = communicationPlanService.getPlanOrThrow(planId);
        CommunicationChannel channel = new CommunicationChannel();
        channel.setPlan(plan);
        applyRequest(channel, request);
        return CommunicationChannelResponse.from(communicationChannelRepository.save(channel));
    }

    @Transactional
    public CommunicationChannelResponse update(Long planId, Long channelId, CommunicationChannelRequest request) {
        CommunicationChannel channel = getChannelOrThrow(planId, channelId);
        applyRequest(channel, request);
        return CommunicationChannelResponse.from(communicationChannelRepository.save(channel));
    }

    @Transactional
    public void delete(Long planId, Long channelId) {
        CommunicationChannel channel = getChannelOrThrow(planId, channelId);
        communicationChannelRepository.delete(channel);
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
