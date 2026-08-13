package org.nj2pc.oem.checkin;

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
public class OperatorRoleService {

    private final OperatorRoleRepository operatorRoleRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public OperatorRoleService(OperatorRoleRepository operatorRoleRepository,
                                PermissionGuard permissionGuard,
                                AuditLogService auditLogService) {
        this.operatorRoleRepository = operatorRoleRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<OperatorRoleResponse> findAll() {
        return operatorRoleRepository.findAll().stream()
                .map(OperatorRoleResponse::from)
                .sorted(Comparator.comparingInt(OperatorRoleResponse::sortOrder))
                .toList();
    }

    @Transactional
    public OperatorRoleResponse create(Authentication authentication, OperatorRoleRequest request) {
        permissionGuard.require(authentication, Permission.OPERATOR_ROLE_MANAGE);
        if (operatorRoleRepository.existsByNameIgnoreCase(request.name())) {
            throw ApiException.conflict("Role already exists: " + request.name());
        }
        OperatorRole role = new OperatorRole();
        role.setName(request.name());
        role.setColor(request.color());
        role.setAccessLevel(request.accessLevel());
        role.setSortOrder((int) operatorRoleRepository.count());
        role = operatorRoleRepository.save(role);
        auditLogService.record(EntityType.OPERATOR_ROLE, role.getId(), "CREATE",
                "Created operator role " + role.getName(), authentication.getName());
        return OperatorRoleResponse.from(role);
    }

    @Transactional
    public OperatorRoleResponse update(Authentication authentication, Long id, OperatorRoleRequest request) {
        permissionGuard.require(authentication, Permission.OPERATOR_ROLE_MANAGE);
        OperatorRole role = getRoleOrThrow(id);
        role.setName(request.name());
        role.setColor(request.color());
        role.setAccessLevel(request.accessLevel());
        role = operatorRoleRepository.save(role);
        auditLogService.record(EntityType.OPERATOR_ROLE, role.getId(), "UPDATE",
                "Updated operator role " + role.getName(), authentication.getName());
        return OperatorRoleResponse.from(role);
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        permissionGuard.require(authentication, Permission.OPERATOR_ROLE_MANAGE);
        OperatorRole role = getRoleOrThrow(id);
        operatorRoleRepository.deleteById(id);
        auditLogService.record(EntityType.OPERATOR_ROLE, id, "DELETE",
                "Deleted operator role " + role.getName(), authentication.getName());
    }

    OperatorRole getRoleOrThrow(Long id) {
        return operatorRoleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Role not found: " + id));
    }
}
