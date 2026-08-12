package org.nj2pc.oem.vehicle;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operators/{operatorId}/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @GetMapping
    public List<VehicleResponse> findByOperator(Authentication authentication, @PathVariable Long operatorId) {
        return vehicleService.findByOperator(authentication, operatorId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleResponse create(Authentication authentication, @PathVariable Long operatorId,
                                   @Valid @RequestBody VehicleRequest request) {
        return vehicleService.create(authentication, operatorId, request);
    }

    @PutMapping("/{id}")
    public VehicleResponse update(Authentication authentication, @PathVariable Long operatorId,
                                   @PathVariable Long id, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.update(authentication, operatorId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long operatorId, @PathVariable Long id) {
        vehicleService.delete(authentication, operatorId, id);
    }
}
