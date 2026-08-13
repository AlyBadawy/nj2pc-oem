package org.nj2pc.oem.operator;

import jakarta.validation.Valid;
import org.nj2pc.oem.checkin.LastRoleResponse;
import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operators")
public class OperatorController {

    private final OperatorService operatorService;
    private final OperatorCheckInService operatorCheckInService;

    public OperatorController(OperatorService operatorService, OperatorCheckInService operatorCheckInService) {
        this.operatorService = operatorService;
        this.operatorCheckInService = operatorCheckInService;
    }

    @GetMapping
    public List<OperatorResponse> findAll(Authentication authentication) {
        return operatorService.findAll(authentication);
    }

    @GetMapping("/{id}")
    public OperatorResponse findById(Authentication authentication, @PathVariable Long id) {
        return operatorService.findById(authentication, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OperatorResponse create(Authentication authentication, @Valid @RequestBody OperatorRequest request) {
        return operatorService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public OperatorResponse update(Authentication authentication, @PathVariable Long id,
                                    @Valid @RequestBody OperatorRequest request) {
        return operatorService.update(authentication, id, request);
    }

    @PutMapping("/{id}/permissions")
    public OperatorResponse updatePermissions(Authentication authentication, @PathVariable Long id,
                                               @Valid @RequestBody OperatorPermissionsRequest request) {
        return operatorService.updatePermissions(authentication, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        operatorService.delete(id);
    }

    @GetMapping("/{id}/last-role")
    public ResponseEntity<LastRoleResponse> lastRole(@PathVariable Long id) {
        return operatorCheckInService.findLastRole(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
