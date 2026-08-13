package org.nj2pc.oem.checkin;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
    public OperatorRoleResponse create(Authentication authentication, @Valid @RequestBody OperatorRoleRequest request) {
        return operatorRoleService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public OperatorRoleResponse update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody OperatorRoleRequest request) {
        return operatorRoleService.update(authentication, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        operatorRoleService.delete(authentication, id);
    }
}
