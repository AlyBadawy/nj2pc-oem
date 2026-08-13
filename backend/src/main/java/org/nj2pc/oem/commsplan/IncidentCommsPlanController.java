package org.nj2pc.oem.commsplan;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents/{incidentId}/comms-plan-applications")
public class IncidentCommsPlanController {

    private final IncidentCommsPlanApplicationService incidentCommsPlanApplicationService;

    public IncidentCommsPlanController(IncidentCommsPlanApplicationService incidentCommsPlanApplicationService) {
        this.incidentCommsPlanApplicationService = incidentCommsPlanApplicationService;
    }

    @GetMapping
    public List<IncidentCommsPlanApplicationResponse> history(@PathVariable Long incidentId) {
        return incidentCommsPlanApplicationService.findHistory(incidentId);
    }

    @GetMapping("/active")
    public ResponseEntity<IncidentCommsPlanApplicationResponse> active(@PathVariable Long incidentId) {
        return incidentCommsPlanApplicationService.findActive(incidentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentCommsPlanApplicationResponse apply(Authentication authentication, @PathVariable Long incidentId,
                                                        @Valid @RequestBody ApplyCommsPlanRequest request) {
        return incidentCommsPlanApplicationService.apply(authentication, incidentId, request);
    }

    @PostMapping("/{applicationId}/revoke")
    public IncidentCommsPlanApplicationResponse revoke(Authentication authentication, @PathVariable Long incidentId,
                                                         @PathVariable Long applicationId) {
        return incidentCommsPlanApplicationService.revoke(authentication, incidentId, applicationId);
    }
}
