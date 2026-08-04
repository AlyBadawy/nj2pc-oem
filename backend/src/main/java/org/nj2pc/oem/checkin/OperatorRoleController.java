package org.nj2pc.oem.checkin;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operator-roles")
public class OperatorRoleController {

    private final OperatorRoleService operatorRoleService;

    public OperatorRoleController(OperatorRoleService operatorRoleService) {
        this.operatorRoleService = operatorRoleService;
    }

    @GetMapping
    public List<OperatorRoleResponse> findAll() {
        return operatorRoleService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorRoleResponse create(@Valid @RequestBody OperatorRoleRequest request) {
        return operatorRoleService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorRoleResponse update(@PathVariable Long id, @Valid @RequestBody OperatorRoleRequest request) {
        return operatorRoleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        operatorRoleService.delete(id);
    }
}
