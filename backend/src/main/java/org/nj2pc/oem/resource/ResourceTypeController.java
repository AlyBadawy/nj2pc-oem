package org.nj2pc.oem.resource;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resource-types")
public class ResourceTypeController {

    private final ResourceTypeService resourceTypeService;

    public ResourceTypeController(ResourceTypeService resourceTypeService) {
        this.resourceTypeService = resourceTypeService;
    }

    @GetMapping
    public List<ResourceTypeResponse> findAll() {
        return resourceTypeService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceTypeResponse create(Authentication authentication, @Valid @RequestBody ResourceTypeRequest request) {
        return resourceTypeService.create(authentication, request);
    }

    @PutMapping("/{id}")
    public ResourceTypeResponse update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody ResourceTypeRequest request) {
        return resourceTypeService.update(authentication, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        resourceTypeService.delete(authentication, id);
    }

    @PostMapping("/{id}/fields")
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceTypeResponse addField(Authentication authentication, @PathVariable Long id,
                                          @Valid @RequestBody ResourceTypeFieldRequest request) {
        return resourceTypeService.addField(authentication, id, request);
    }

    @PutMapping("/{id}/fields/{fieldId}")
    public ResourceTypeResponse updateField(Authentication authentication, @PathVariable Long id,
                                             @PathVariable Long fieldId,
                                             @Valid @RequestBody ResourceTypeFieldRequest request) {
        return resourceTypeService.updateField(authentication, id, fieldId, request);
    }

    @DeleteMapping("/{id}/fields/{fieldId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteField(Authentication authentication, @PathVariable Long id, @PathVariable Long fieldId) {
        resourceTypeService.deleteField(authentication, id, fieldId);
    }
}
