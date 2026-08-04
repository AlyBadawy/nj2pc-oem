package org.nj2pc.oem.operator;

import jakarta.validation.Valid;
import org.nj2pc.oem.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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
    public List<?> findAll(Authentication authentication) {
        if (isRestricted(authentication)) {
            return operatorService.findAllSummary();
        }
        return operatorService.findAll();
    }

    @GetMapping("/{id}")
    public OperatorResponse findById(Authentication authentication, @PathVariable Long id) {
        if (isRestricted(authentication)) {
            throw ApiException.forbidden("You do not have permission to view operator details");
        }
        return operatorService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorResponse create(Authentication authentication, @Valid @RequestBody OperatorRequest request) {
        return operatorService.create(request, authentication.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorResponse update(@PathVariable Long id, @Valid @RequestBody OperatorRequest request) {
        return operatorService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        operatorService.delete(id);
    }

    private boolean isRestricted(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_RESTRICTED"::equals);
    }
}
