package org.nj2pc.oem.commsplan;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comms-plans")
public class CommunicationPlanController {

    private final CommunicationPlanService communicationPlanService;
    private final CommunicationChannelService communicationChannelService;

    public CommunicationPlanController(CommunicationPlanService communicationPlanService,
                                        CommunicationChannelService communicationChannelService) {
        this.communicationPlanService = communicationPlanService;
        this.communicationChannelService = communicationChannelService;
    }

    @GetMapping
    public List<CommunicationPlanResponse> findAll(@RequestParam(required = false) Long incidentId) {
        if (incidentId != null) {
            return communicationPlanService.findByIncident(incidentId);
        }
        return communicationPlanService.findAll();
    }

    @GetMapping("/{id}")
    public CommunicationPlanResponse findById(@PathVariable Long id) {
        return communicationPlanService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommunicationPlanResponse create(@Valid @RequestBody CommunicationPlanRequest request) {
        return communicationPlanService.create(request);
    }

    @PutMapping("/{id}")
    public CommunicationPlanResponse update(@PathVariable Long id, @Valid @RequestBody CommunicationPlanRequest request) {
        return communicationPlanService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        communicationPlanService.delete(id);
    }

    @PostMapping("/{id}/incidents/{incidentId}")
    public CommunicationPlanResponse linkIncident(@PathVariable Long id, @PathVariable Long incidentId) {
        return communicationPlanService.linkIncident(id, incidentId);
    }

    @DeleteMapping("/{id}/incidents/{incidentId}")
    public CommunicationPlanResponse unlinkIncident(@PathVariable Long id, @PathVariable Long incidentId) {
        return communicationPlanService.unlinkIncident(id, incidentId);
    }

    @GetMapping("/{id}/channels")
    public List<CommunicationChannelResponse> findChannels(@PathVariable Long id) {
        return communicationChannelService.findByPlan(id);
    }

    @PostMapping("/{id}/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public CommunicationChannelResponse createChannel(@PathVariable Long id,
                                                        @Valid @RequestBody CommunicationChannelRequest request) {
        return communicationChannelService.create(id, request);
    }

    @PutMapping("/{id}/channels/{channelId}")
    public CommunicationChannelResponse updateChannel(@PathVariable Long id, @PathVariable Long channelId,
                                                        @Valid @RequestBody CommunicationChannelRequest request) {
        return communicationChannelService.update(id, channelId, request);
    }

    @DeleteMapping("/{id}/channels/{channelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChannel(@PathVariable Long id, @PathVariable Long channelId) {
        communicationChannelService.delete(id, channelId);
    }
}
