package org.nj2pc.oem.operator;

import org.nj2pc.oem.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class PermissionGuard {

    private final OperatorRepository operatorRepository;

    public PermissionGuard(OperatorRepository operatorRepository) {
        this.operatorRepository = operatorRepository;
    }

    public Operator requireCaller(Authentication authentication) {
        return operatorRepository.findByCallsignIgnoreCase(authentication.getName())
                .orElseThrow(() -> ApiException.forbidden("You do not have permission to perform this action"));
    }

    public boolean has(Authentication authentication, Permission permission) {
        Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName()).orElse(null);
        return caller != null && (caller.isAdmin() || caller.getPermissions().contains(permission));
    }

    public void require(Authentication authentication, Permission permission) {
        if (!has(authentication, permission)) {
            throw ApiException.forbidden("You do not have permission to perform this action");
        }
    }

    /**
     * Allows the action when the caller is the target operator themselves, or holds the given
     * elevated permission (or is admin) — the "manage your own X, or anyone's with permission Y" pattern.
     */
    public void requireSelfOrPermission(Authentication authentication, Long targetOperatorId, Permission permission) {
        requireSelfOrAnyPermission(authentication, targetOperatorId, permission);
    }

    /**
     * Same as {@link #requireSelfOrPermission}, but accepts any one of several elevated
     * permissions — for actions two different permission grants can each independently unlock.
     */
    public void requireSelfOrAnyPermission(Authentication authentication, Long targetOperatorId,
                                            Permission... permissions) {
        Operator caller = requireCaller(authentication);
        if (caller.isAdmin()) {
            return;
        }
        for (Permission permission : permissions) {
            if (caller.getPermissions().contains(permission)) {
                return;
            }
        }
        if (!caller.getId().equals(targetOperatorId)) {
            throw ApiException.forbidden("You do not have permission to perform this action");
        }
    }
}
