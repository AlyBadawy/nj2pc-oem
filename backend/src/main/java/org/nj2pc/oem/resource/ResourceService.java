package org.nj2pc.oem.resource;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceTypeRepository resourceTypeRepository;
    private final OperatorRepository operatorRepository;

    public ResourceService(ResourceRepository resourceRepository,
                            ResourceTypeRepository resourceTypeRepository,
                            OperatorRepository operatorRepository) {
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
        this.operatorRepository = operatorRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> findAll() {
        return resourceRepository.findAll().stream().map(ResourceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ResourceResponse findById(Long id) {
        return ResourceResponse.from(getResourceOrThrow(id));
    }

    @Transactional
    public ResourceResponse create(ResourceRequest request) {
        Resource resource = new Resource();
        applyRequest(resource, request);
        return ResourceResponse.from(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse update(Long id, ResourceRequest request) {
        Resource resource = getResourceOrThrow(id);
        applyRequest(resource, request);
        return ResourceResponse.from(resourceRepository.save(resource));
    }

    @Transactional
    public void delete(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw ApiException.notFound("Resource not found: " + id);
        }
        resourceRepository.deleteById(id);
    }

    private Resource getResourceOrThrow(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Resource not found: " + id));
    }

    private void applyRequest(Resource resource, ResourceRequest request) {
        ResourceType type = resourceTypeRepository.findById(request.resourceTypeId())
                .orElseThrow(() -> ApiException.notFound("Resource type not found: " + request.resourceTypeId()));
        resource.setType(type);
        resource.setIdentifier(request.identifier());
        resource.setSerialNumber(request.serialNumber());
        resource.setNotes(request.notes());

        if (request.ownerId() != null) {
            Operator owner = operatorRepository.findById(request.ownerId())
                    .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.ownerId()));
            resource.setOwner(owner);
        } else {
            resource.setOwner(null);
        }
    }
}
