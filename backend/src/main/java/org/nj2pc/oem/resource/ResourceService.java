package org.nj2pc.oem.resource;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.checkin.ResourceCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceTypeRepository resourceTypeRepository;
    private final OperatorRepository operatorRepository;
    private final ResourceCheckInRepository resourceCheckInRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public ResourceService(ResourceRepository resourceRepository,
                            ResourceTypeRepository resourceTypeRepository,
                            OperatorRepository operatorRepository,
                            ResourceCheckInRepository resourceCheckInRepository,
                            PermissionGuard permissionGuard,
                            AuditLogService auditLogService) {
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
        this.operatorRepository = operatorRepository;
        this.resourceCheckInRepository = resourceCheckInRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> findAll() {
        Map<Long, String> lastLocationByResourceId = new LinkedHashMap<>();
        for (Object[] row : resourceCheckInRepository.findLastDeploymentLocationRows()) {
            lastLocationByResourceId.putIfAbsent((Long) row[0], (String) row[1]);
        }
        return resourceRepository.findAll().stream()
                .map(r -> ResourceResponse.from(r, lastLocationByResourceId.get(r.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ResourceResponse findById(Long id) {
        return ResourceResponse.from(getResourceOrThrow(id));
    }

    @Transactional
    public ResourceResponse create(Authentication authentication, ResourceRequest request) {
        Operator caller = permissionGuard.requireCaller(authentication);
        Resource resource = new Resource();
        applyRequest(resource, request, caller);
        resource = resourceRepository.save(resource);
        auditLogService.record(EntityType.RESOURCE, resource.getId(), "CREATE",
                "Created resource " + resource.getIdentifier(), authentication.getName());
        return ResourceResponse.from(resource);
    }

    @Transactional
    public ResourceResponse update(Authentication authentication, Long id, ResourceRequest request) {
        Resource resource = getResourceOrThrow(id);
        requireManage(authentication, resource);
        Operator caller = permissionGuard.requireCaller(authentication);
        applyRequest(resource, request, caller);
        resource = resourceRepository.save(resource);
        auditLogService.record(EntityType.RESOURCE, resource.getId(), "UPDATE",
                "Updated resource " + resource.getIdentifier(), authentication.getName());
        return ResourceResponse.from(resource);
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        Resource resource = getResourceOrThrow(id);
        requireManage(authentication, resource);
        resourceRepository.deleteById(id);
        auditLogService.record(EntityType.RESOURCE, id, "DELETE",
                "Deleted resource " + resource.getIdentifier(), authentication.getName());
    }

    private void requireManage(Authentication authentication, Resource resource) {
        if (resource.getOwner() != null) {
            permissionGuard.requireSelfOrPermission(authentication, resource.getOwner().getId(),
                    Permission.RESOURCE_MANAGE_ALL);
        } else {
            permissionGuard.require(authentication, Permission.RESOURCE_MANAGE_ALL);
        }
    }

    private Resource getResourceOrThrow(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Resource not found: " + id));
    }

    private void applyRequest(Resource resource, ResourceRequest request, Operator caller) {
        ResourceType type = resourceTypeRepository.findById(request.resourceTypeId())
                .orElseThrow(() -> ApiException.notFound("Resource type not found: " + request.resourceTypeId()));
        resource.setType(type);
        resourceRepository.findFirstByIdentifierIgnoreCase(request.identifier())
                .filter(existing -> !existing.getId().equals(resource.getId()))
                .ifPresent(existing -> {
                    throw ApiException.conflict("Another resource already uses identifier " + request.identifier());
                });
        resource.setIdentifier(request.identifier());
        resource.setSerialNumber(request.serialNumber());
        resource.setNotes(request.notes());
        resource.setCustomFields(sanitizeCustomFields(type, request.customFields()));

        boolean canAssignAnyOwner = caller.isAdmin()
                || caller.getPermissions().contains(Permission.RESOURCE_MANAGE_ALL)
                || caller.getPermissions().contains(Permission.RESOURCE_ASSIGN_OWNER);
        if (!canAssignAnyOwner) {
            resource.setOwner(caller);
            return;
        }

        if (request.ownerId() != null) {
            Operator owner = operatorRepository.findById(request.ownerId())
                    .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.ownerId()));
            resource.setOwner(owner);
        } else {
            resource.setOwner(null);
        }
    }

    private Map<String, Object> sanitizeCustomFields(ResourceType type, Map<String, Object> input) {
        Map<String, Object> source = input != null ? input : Map.of();
        Map<String, Object> result = new LinkedHashMap<>();
        if (type.getFields() == null) {
            return result;
        }
        for (ResourceTypeField field : type.getFields()) {
            Object value = source.get(field.getName());
            boolean blank = value == null || (value instanceof String s && s.isBlank());
            if (field.isRequired() && blank) {
                throw ApiException.badRequest("Missing required field: " + field.getName());
            }
            if (!blank) {
                result.put(field.getName(), value);
            }
        }
        return result;
    }
}
