package org.nj2pc.oem.incident;

import jakarta.validation.Valid;
import org.nj2pc.oem.checkin.OperatorCheckInRequest;
import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInRequest;
import org.nj2pc.oem.checkin.ResourceCheckInResponse;
import org.nj2pc.oem.checkin.ResourceCheckInService;
import org.nj2pc.oem.commsplan.CommunicationPlanResponse;
import org.nj2pc.oem.commsplan.CommunicationPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;
    private final IncidentLogService incidentLogService;
    private final CommunicationPlanService communicationPlanService;
    private final OperatorCheckInService operatorCheckInService;
    private final ResourceCheckInService resourceCheckInService;

    public IncidentController(IncidentService incidentService,
                               IncidentLogService incidentLogService,
                               CommunicationPlanService communicationPlanService,
                               OperatorCheckInService operatorCheckInService,
                               ResourceCheckInService resourceCheckInService) {
        this.incidentService = incidentService;
        this.incidentLogService = incidentLogService;
        this.communicationPlanService = communicationPlanService;
        this.operatorCheckInService = operatorCheckInService;
        this.resourceCheckInService = resourceCheckInService;
    }

    @GetMapping
    public List<IncidentResponse> findAll(Authentication authentication) {
        return incidentService.findAll(authentication);
    }

    @GetMapping("/{id}")
    public IncidentResponse findById(Authentication authentication, @PathVariable Long id) {
        return incidentService.findById(authentication, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse create(Authentication authentication, @Valid @RequestBody IncidentRequest request) {
        return incidentService.create(request, authentication.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse update(@PathVariable Long id, @Valid @RequestBody IncidentRequest request) {
        return incidentService.update(id, request);
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse start(@PathVariable Long id) {
        return incidentService.start(id);
    }

    @PostMapping("/{id}/end")
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse end(@PathVariable Long id) {
        return incidentService.end(id);
    }

    @GetMapping("/{id}/logs")
    public List<IncidentLogResponse> findLogs(@PathVariable Long id) {
        return incidentLogService.findByIncident(id);
    }

    @PostMapping("/{id}/logs")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentLogResponse createLog(@PathVariable Long id, @Valid @RequestBody IncidentLogRequest request) {
        return incidentLogService.create(id, request);
    }

    @GetMapping("/{id}/comms-plans")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CommunicationPlanResponse> findCommsPlans(@PathVariable Long id) {
        return communicationPlanService.findByIncident(id);
    }

    @GetMapping("/{id}/operator-checkins")
    public List<OperatorCheckInResponse> findOperatorCheckIns(@PathVariable Long id) {
        return operatorCheckInService.findByIncident(id);
    }

    @PostMapping("/{id}/operator-checkins")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorCheckInResponse checkInOperator(@PathVariable Long id,
                                                     @Valid @RequestBody OperatorCheckInRequest request) {
        return operatorCheckInService.checkIn(id, request);
    }

    @PostMapping("/{id}/operator-checkins/{checkInId}/checkout")
    public OperatorCheckInResponse checkOutOperator(Authentication authentication, @PathVariable Long id,
                                                      @PathVariable Long checkInId) {
        return operatorCheckInService.checkOut(authentication, id, checkInId);
    }

    @GetMapping("/{id}/resource-checkins")
    public List<ResourceCheckInResponse> findResourceCheckIns(@PathVariable Long id) {
        return resourceCheckInService.findByIncident(id);
    }

    @PostMapping("/{id}/resource-checkins")
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceCheckInResponse checkInResource(@PathVariable Long id,
                                                     @Valid @RequestBody ResourceCheckInRequest request) {
        return resourceCheckInService.checkIn(id, request);
    }

    @PostMapping("/{id}/resource-checkins/{checkInId}/checkout")
    public ResourceCheckInResponse checkOutResource(@PathVariable Long id, @PathVariable Long checkInId) {
        return resourceCheckInService.checkOut(id, checkInId);
    }
}
