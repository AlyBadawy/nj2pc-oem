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
    public List<IncidentResponse> findAll() {
        return incidentService.findAll();
    }

    @GetMapping("/{id}")
    public IncidentResponse findById(@PathVariable Long id) {
        return incidentService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse create(@Valid @RequestBody IncidentRequest request) {
        return incidentService.create(request);
    }

    @PutMapping("/{id}")
    public IncidentResponse update(@PathVariable Long id, @Valid @RequestBody IncidentRequest request) {
        return incidentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        incidentService.delete(id);
    }

    @PostMapping("/{id}/end")
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
    public List<CommunicationPlanResponse> findCommsPlans(@PathVariable Long id) {
        return communicationPlanService.findByIncident(id);
    }

    @GetMapping("/{id}/operator-checkins")
    public List<OperatorCheckInResponse> findOperatorCheckIns(@PathVariable Long id) {
        return operatorCheckInService.findByIncident(id);
    }

    @PostMapping("/{id}/operator-checkins")
    @ResponseStatus(HttpStatus.CREATED)
    public OperatorCheckInResponse checkInOperator(@PathVariable Long id,
                                                     @Valid @RequestBody OperatorCheckInRequest request) {
        return operatorCheckInService.checkIn(id, request);
    }

    @PostMapping("/{id}/operator-checkins/{checkInId}/checkout")
    public OperatorCheckInResponse checkOutOperator(@PathVariable Long id, @PathVariable Long checkInId) {
        return operatorCheckInService.checkOut(id, checkInId);
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
