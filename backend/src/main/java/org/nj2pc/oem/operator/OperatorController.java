package org.nj2pc.oem.operator;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operators")
public class OperatorController {

    private final OperatorService operatorService;

    public OperatorController(OperatorService operatorService) {
        this.operatorService = operatorService;
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
    @PreAuthorize("hasRole('ADMIN')")
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
}
