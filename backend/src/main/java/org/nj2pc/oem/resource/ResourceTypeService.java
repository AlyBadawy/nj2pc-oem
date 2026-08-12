package org.nj2pc.oem.resource;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class ResourceTypeService {

    private final ResourceTypeRepository resourceTypeRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public ResourceTypeService(ResourceTypeRepository resourceTypeRepository, PermissionGuard permissionGuard,
                                AuditLogService auditLogService) {
        this.resourceTypeRepository = resourceTypeRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<ResourceTypeResponse> findAll() {
        return resourceTypeRepository.findAll().stream()
                .map(ResourceTypeResponse::from)
                .sorted(Comparator.comparing(ResourceTypeResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public ResourceTypeResponse create(Authentication authentication, ResourceTypeRequest request) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        if (resourceTypeRepository.existsByNameIgnoreCase(request.name())) {
            throw ApiException.conflict("Resource type already exists: " + request.name());
        }
        ResourceType type = new ResourceType();
        type.setName(request.name());
        type = resourceTypeRepository.save(type);
        auditLogService.record(EntityType.RESOURCE_TYPE, type.getId(), "CREATE",
                "Created resource type " + type.getName(), authentication.getName());
        return ResourceTypeResponse.from(type);
    }

    @Transactional
    public ResourceTypeResponse update(Authentication authentication, Long id, ResourceTypeRequest request) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        ResourceType type = getTypeOrThrow(id);
        type.setName(request.name());
        type = resourceTypeRepository.save(type);
        auditLogService.record(EntityType.RESOURCE_TYPE, type.getId(), "UPDATE",
                "Updated resource type " + type.getName(), authentication.getName());
        return ResourceTypeResponse.from(type);
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        ResourceType type = getTypeOrThrow(id);
        resourceTypeRepository.deleteById(id);
        auditLogService.record(EntityType.RESOURCE_TYPE, id, "DELETE",
                "Deleted resource type " + type.getName(), authentication.getName());
    }

    ResourceType getTypeOrThrow(Long id) {
        return resourceTypeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Resource type not found: " + id));
    }
}
