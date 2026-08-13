package org.nj2pc.oem.commsplan;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comms-plans")
public class CommunicationPlanController {

    private final CommunicationPlanService communicationPlanService;
    private final CommunicationChannelService communicationChannelService;
    private final Ics205PdfService ics205PdfService;

    public CommunicationPlanController(CommunicationPlanService communicationPlanService,
                                        CommunicationChannelService communicationChannelService,
                                        Ics205PdfService ics205PdfService) {
        this.communicationPlanService = communicationPlanService;
        this.communicationChannelService = communicationChannelService;
        this.ics205PdfService = ics205PdfService;
    }

    @GetMapping
    public List<CommunicationPlanResponse> findAll(@RequestParam(required = false) Long incidentId,
                                                     @RequestParam(required = false) Boolean active) {
        if (incidentId != null) {
            return communicationPlanService.findByIncident(incidentId);
        }
        if (active != null && active) {
            return communicationPlanService.findAll(true);
        }
        return communicationPlanService.findAll();
    }

    @GetMapping("/{id}")
    public CommunicationPlanResponse findById(@PathVariable Long id) {
        return communicationPlanService.findById(id);
    }

    @GetMapping("/{id}/versions")
    public List<CommunicationPlanResponse> findVersions(@PathVariable Long id) {
        return communicationPlanService.findVersions(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommunicationPlanResponse create(Authentication authentication, @Valid @RequestBody CommunicationPlanRequest request) {
        return communicationPlanService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public CommunicationPlanResponse update(Authentication authentication, @PathVariable Long id,
                                             @Valid @RequestBody CommunicationPlanRequest request) {
        return communicationPlanService.update(authentication, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        communicationPlanService.delete(authentication, id);
    }

    @PostMapping("/{id}/incidents/{incidentId}")
    public CommunicationPlanResponse linkIncident(Authentication authentication, @PathVariable Long id,
                                                   @PathVariable Long incidentId) {
        return communicationPlanService.linkIncident(authentication, id, incidentId);
    }

    @DeleteMapping("/{id}/incidents/{incidentId}")
    public CommunicationPlanResponse unlinkIncident(Authentication authentication, @PathVariable Long id,
                                                     @PathVariable Long incidentId) {
        return communicationPlanService.unlinkIncident(authentication, id, incidentId);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        byte[] pdf = ics205PdfService.generate(id);
        CommunicationPlanResponse plan = communicationPlanService.findById(id);
        String filename = "ICS-205-" + plan.name().replaceAll("[^a-zA-Z0-9-]+", "_") + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @GetMapping("/{id}/channels")
    public List<CommunicationChannelResponse> findChannels(@PathVariable Long id) {
        return communicationChannelService.findByPlan(id);
    }

    @PostMapping("/{id}/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public CommunicationChannelResponse createChannel(Authentication authentication, @PathVariable Long id,
                                                        @Valid @RequestBody CommunicationChannelRequest request) {
        return communicationChannelService.create(authentication, id, request);
    }

    @PutMapping("/{id}/channels/{channelId}")
    public CommunicationChannelResponse updateChannel(Authentication authentication, @PathVariable Long id,
                                                        @PathVariable Long channelId,
                                                        @Valid @RequestBody CommunicationChannelRequest request) {
        return communicationChannelService.update(authentication, id, channelId, request);
    }

    @DeleteMapping("/{id}/channels/{channelId}")
    public Map<String, Long> deleteChannel(Authentication authentication, @PathVariable Long id, @PathVariable Long channelId) {
        return Map.of("planId", communicationChannelService.delete(authentication, id, channelId));
    }
}
