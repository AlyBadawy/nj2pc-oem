package org.nj2pc.oem.incident;

import jakarta.validation.Valid;
import org.nj2pc.oem.checkin.OperatorCheckInRequest;
import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInRequest;
import org.nj2pc.oem.checkin.ResourceCheckInResponse;
import org.nj2pc.oem.checkin.ResourceCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInUpdateRequest;
import org.nj2pc.oem.commsplan.CommunicationPlanResponse;
import org.nj2pc.oem.commsplan.CommunicationPlanService;
import org.nj2pc.oem.deploymentlocation.DeploymentLocationRequest;
import org.nj2pc.oem.deploymentlocation.DeploymentLocationResponse;
import org.nj2pc.oem.deploymentlocation.DeploymentLocationService;
import org.nj2pc.oem.mesh.MeshSessionDetailResponse;
import org.nj2pc.oem.mesh.MeshSessionPdfRequest;
import org.nj2pc.oem.mesh.MeshSessionPdfService;
import org.nj2pc.oem.mesh.MeshSessionService;
import org.nj2pc.oem.mesh.MeshSessionSubmitRequest;
import org.nj2pc.oem.mesh.MeshSessionSummaryResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    private final MeshSessionService meshSessionService;
    private final MeshSessionPdfService meshSessionPdfService;
    private final DeploymentLocationService deploymentLocationService;

    public IncidentController(IncidentService incidentService,
                               IncidentLogService incidentLogService,
                               CommunicationPlanService communicationPlanService,
                               OperatorCheckInService operatorCheckInService,
                               ResourceCheckInService resourceCheckInService,
                               MeshSessionService meshSessionService,
                               MeshSessionPdfService meshSessionPdfService,
                               DeploymentLocationService deploymentLocationService) {
        this.incidentService = incidentService;
        this.incidentLogService = incidentLogService;
        this.communicationPlanService = communicationPlanService;
        this.operatorCheckInService = operatorCheckInService;
        this.resourceCheckInService = resourceCheckInService;
        this.meshSessionService = meshSessionService;
        this.meshSessionPdfService = meshSessionPdfService;
        this.deploymentLocationService = deploymentLocationService;
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
    public IncidentResponse create(Authentication authentication, @Valid @RequestBody IncidentRequest request) {
        return incidentService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public IncidentResponse update(Authentication authentication, @PathVariable Long id,
                                    @Valid @RequestBody IncidentRequest request) {
        return incidentService.update(authentication, id, request);
    }

    @PostMapping("/{id}/start")
    public IncidentResponse start(Authentication authentication, @PathVariable Long id) {
        return incidentService.start(authentication, id);
    }

    @PostMapping("/{id}/end")
    public IncidentResponse end(Authentication authentication, @PathVariable Long id) {
        return incidentService.end(authentication, id);
    }

    @GetMapping("/{id}/permissions")
    public List<IncidentPermissionGrantResponse> findPermissions(Authentication authentication, @PathVariable Long id) {
        return incidentService.findPermissions(authentication, id);
    }

    @PutMapping("/{id}/permissions")
    public List<IncidentPermissionGrantResponse> updatePermissions(Authentication authentication, @PathVariable Long id,
                                                                      @Valid @RequestBody IncidentPermissionsRequest request) {
        return incidentService.updatePermissions(authentication, id, request);
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
    public OperatorCheckInResponse checkInOperator(Authentication authentication, @PathVariable Long id,
                                                     @Valid @RequestBody OperatorCheckInRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return operatorCheckInService.checkIn(authentication, id, request);
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
    public ResourceCheckInResponse checkInResource(Authentication authentication, @PathVariable Long id,
                                                     @Valid @RequestBody ResourceCheckInRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return resourceCheckInService.checkIn(authentication, id, request);
    }

    @PostMapping("/{id}/resource-checkins/{checkInId}/checkout")
    public ResourceCheckInResponse checkOutResource(Authentication authentication, @PathVariable Long id,
                                                       @PathVariable Long checkInId) {
        return resourceCheckInService.checkOut(authentication, id, checkInId);
    }

    @PutMapping("/{id}/resource-checkins/{checkInId}")
    public ResourceCheckInResponse updateResourceCheckIn(Authentication authentication, @PathVariable Long id,
                                                            @PathVariable Long checkInId,
                                                            @RequestBody ResourceCheckInUpdateRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return resourceCheckInService.update(authentication, id, checkInId, request);
    }

    @GetMapping("/{id}/mesh-sessions")
    public List<MeshSessionSummaryResponse> findMeshSessions(@PathVariable Long id) {
        return meshSessionService.findByIncident(id);
    }

    @GetMapping("/{id}/mesh-sessions/{sessionId}")
    public MeshSessionDetailResponse findMeshSession(@PathVariable Long id, @PathVariable Long sessionId) {
        return meshSessionService.findById(id, sessionId);
    }

    @PostMapping("/{id}/mesh-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public MeshSessionDetailResponse submitMeshSession(Authentication authentication, @PathVariable Long id,
                                                          @Valid @RequestBody MeshSessionSubmitRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return meshSessionService.submit(authentication, id, request);
    }

    @DeleteMapping("/{id}/mesh-sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMeshSession(Authentication authentication, @PathVariable Long id, @PathVariable Long sessionId) {
        incidentService.requireEditAccess(authentication, id);
        meshSessionService.delete(authentication, id, sessionId);
    }

    @PostMapping("/{id}/mesh-sessions/{sessionId}/pdf")
    public ResponseEntity<byte[]> downloadMeshSessionPdf(@PathVariable Long id, @PathVariable Long sessionId,
                                                            @Valid @RequestBody MeshSessionPdfRequest request) {
        byte[] pdf = meshSessionPdfService.generate(id, sessionId, request);
        String filename = "Mesh-Scan-" + sessionId + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @GetMapping("/{id}/deployment-locations")
    public List<DeploymentLocationResponse> findDeploymentLocations(@PathVariable Long id) {
        return deploymentLocationService.findByIncident(id);
    }

    @PostMapping("/{id}/deployment-locations")
    @ResponseStatus(HttpStatus.CREATED)
    public DeploymentLocationResponse createDeploymentLocation(Authentication authentication, @PathVariable Long id,
                                                                  @Valid @RequestBody DeploymentLocationRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return deploymentLocationService.create(authentication, id, request);
    }

    @PutMapping("/{id}/deployment-locations/{locationId}")
    public DeploymentLocationResponse updateDeploymentLocation(Authentication authentication, @PathVariable Long id,
                                                                  @PathVariable Long locationId,
                                                                  @Valid @RequestBody DeploymentLocationRequest request) {
        incidentService.requireEditAccess(authentication, id);
        return deploymentLocationService.update(authentication, id, locationId, request);
    }
}
