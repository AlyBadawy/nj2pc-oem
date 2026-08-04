package org.nj2pc.oem.incident;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;
    private final IncidentLogService incidentLogService;

    public IncidentController(IncidentService incidentService, IncidentLogService incidentLogService) {
        this.incidentService = incidentService;
        this.incidentLogService = incidentLogService;
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

    @GetMapping("/{id}/logs")
    public List<IncidentLogResponse> findLogs(@PathVariable Long id) {
        return incidentLogService.findByIncident(id);
    }

    @PostMapping("/{id}/logs")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentLogResponse createLog(@PathVariable Long id, @Valid @RequestBody IncidentLogRequest request) {
        return incidentLogService.create(id, request);
    }
}
