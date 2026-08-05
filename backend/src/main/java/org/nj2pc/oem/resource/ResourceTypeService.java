package org.nj2pc.oem.resource;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class ResourceTypeService {

    private final ResourceTypeRepository resourceTypeRepository;

    public ResourceTypeService(ResourceTypeRepository resourceTypeRepository) {
        this.resourceTypeRepository = resourceTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceTypeResponse> findAll() {
        return resourceTypeRepository.findAll().stream()
                .map(ResourceTypeResponse::from)
                .sorted(Comparator.comparing(ResourceTypeResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public ResourceTypeResponse create(ResourceTypeRequest request) {
        if (resourceTypeRepository.existsByNameIgnoreCase(request.name())) {
            throw ApiException.conflict("Resource type already exists: " + request.name());
        }
        ResourceType type = new ResourceType();
        type.setName(request.name());
        return ResourceTypeResponse.from(resourceTypeRepository.save(type));
    }

    @Transactional
    public ResourceTypeResponse update(Long id, ResourceTypeRequest request) {
        ResourceType type = getTypeOrThrow(id);
        type.setName(request.name());
        return ResourceTypeResponse.from(resourceTypeRepository.save(type));
    }

    @Transactional
    public void delete(Long id) {
        if (!resourceTypeRepository.existsById(id)) {
            throw ApiException.notFound("Resource type not found: " + id);
        }
        resourceTypeRepository.deleteById(id);
    }

    ResourceType getTypeOrThrow(Long id) {
        return resourceTypeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Resource type not found: " + id));
    }
}
