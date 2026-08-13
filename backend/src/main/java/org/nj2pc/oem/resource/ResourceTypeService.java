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
    private final ResourceTypeFieldRepository resourceTypeFieldRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public ResourceTypeService(ResourceTypeRepository resourceTypeRepository,
                                ResourceTypeFieldRepository resourceTypeFieldRepository,
                                PermissionGuard permissionGuard,
                                AuditLogService auditLogService) {
        this.resourceTypeRepository = resourceTypeRepository;
        this.resourceTypeFieldRepository = resourceTypeFieldRepository;
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

    @Transactional
    public ResourceTypeResponse addField(Authentication authentication, Long resourceTypeId,
                                          ResourceTypeFieldRequest request) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        ResourceType type = getTypeOrThrow(resourceTypeId);
        if (resourceTypeFieldRepository.existsByResourceTypeIdAndNameIgnoreCase(resourceTypeId, request.name())) {
            throw ApiException.conflict("Field already exists on this equipment type: " + request.name());
        }
        ResourceTypeField field = new ResourceTypeField();
        field.setResourceType(type);
        field.setName(request.name());
        field.setFieldType(request.fieldType());
        field.setRequired(request.required());
        field.setOptions(request.options());
        field.setSortOrder(resourceTypeFieldRepository.countByResourceTypeId(resourceTypeId));
        resourceTypeFieldRepository.save(field);
        auditLogService.record(EntityType.RESOURCE_TYPE, type.getId(), "FIELD_ADD",
                "Added field " + field.getName() + " to equipment type " + type.getName(), authentication.getName());
        return ResourceTypeResponse.from(resourceTypeRepository.findById(resourceTypeId).orElseThrow());
    }

    @Transactional
    public ResourceTypeResponse updateField(Authentication authentication, Long resourceTypeId, Long fieldId,
                                             ResourceTypeFieldRequest request) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        ResourceType type = getTypeOrThrow(resourceTypeId);
        ResourceTypeField field = getFieldOrThrow(resourceTypeId, fieldId);
        field.setFieldType(request.fieldType());
        field.setRequired(request.required());
        field.setOptions(request.options());
        resourceTypeFieldRepository.save(field);
        auditLogService.record(EntityType.RESOURCE_TYPE, type.getId(), "FIELD_UPDATE",
                "Updated field " + field.getName() + " on equipment type " + type.getName(), authentication.getName());
        return ResourceTypeResponse.from(resourceTypeRepository.findById(resourceTypeId).orElseThrow());
    }

    @Transactional
    public void deleteField(Authentication authentication, Long resourceTypeId, Long fieldId) {
        permissionGuard.require(authentication, Permission.RESOURCE_TYPE_MANAGE);
        ResourceType type = getTypeOrThrow(resourceTypeId);
        ResourceTypeField field = getFieldOrThrow(resourceTypeId, fieldId);
        resourceTypeFieldRepository.delete(field);
        auditLogService.record(EntityType.RESOURCE_TYPE, type.getId(), "FIELD_DELETE",
                "Deleted field " + field.getName() + " from equipment type " + type.getName(), authentication.getName());
    }

    private ResourceTypeField getFieldOrThrow(Long resourceTypeId, Long fieldId) {
        ResourceTypeField field = resourceTypeFieldRepository.findById(fieldId)
                .orElseThrow(() -> ApiException.notFound("Field not found: " + fieldId));
        if (!field.getResourceType().getId().equals(resourceTypeId)) {
            throw ApiException.notFound("Field not found: " + fieldId);
        }
        return field;
    }
}
