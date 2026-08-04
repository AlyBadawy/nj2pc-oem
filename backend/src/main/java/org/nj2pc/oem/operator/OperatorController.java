package org.nj2pc.oem.operator;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public List<OperatorResponse> findAll() {
        return operatorService.findAll();
    }

    @GetMapping("/{id}")
    public OperatorResponse findById(@PathVariable Long id) {
        return operatorService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OperatorResponse create(@Valid @RequestBody OperatorRequest request) {
        return operatorService.create(request);
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
}
