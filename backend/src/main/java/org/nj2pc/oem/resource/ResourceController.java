package org.nj2pc.oem.resource;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public List<ResourceResponse> findAll() {
        return resourceService.findAll();
    }

    @GetMapping("/{id}")
    public ResourceResponse findById(@PathVariable Long id) {
        return resourceService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceResponse create(Authentication authentication, @Valid @RequestBody ResourceRequest request) {
        return resourceService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public ResourceResponse update(Authentication authentication, @PathVariable Long id,
                                    @Valid @RequestBody ResourceRequest request) {
        return resourceService.update(authentication, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        resourceService.delete(authentication, id);
    }
}
