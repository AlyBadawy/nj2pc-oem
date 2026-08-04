package org.nj2pc.oem.checkin;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class OperatorRoleService {

    private final OperatorRoleRepository operatorRoleRepository;

    public OperatorRoleService(OperatorRoleRepository operatorRoleRepository) {
        this.operatorRoleRepository = operatorRoleRepository;
    }

    @Transactional(readOnly = true)
    public List<OperatorRoleResponse> findAll() {
        return operatorRoleRepository.findAll().stream()
                .map(OperatorRoleResponse::from)
                .sorted(Comparator.comparing(OperatorRoleResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public OperatorRoleResponse create(OperatorRoleRequest request) {
        if (operatorRoleRepository.existsByNameIgnoreCase(request.name())) {
            throw ApiException.conflict("Role already exists: " + request.name());
        }
        OperatorRole role = new OperatorRole();
        role.setName(request.name());
        return OperatorRoleResponse.from(operatorRoleRepository.save(role));
    }

    @Transactional
    public OperatorRoleResponse update(Long id, OperatorRoleRequest request) {
        OperatorRole role = getRoleOrThrow(id);
        role.setName(request.name());
        return OperatorRoleResponse.from(operatorRoleRepository.save(role));
    }

    @Transactional
    public void delete(Long id) {
        if (!operatorRoleRepository.existsById(id)) {
            throw ApiException.notFound("Role not found: " + id);
        }
        operatorRoleRepository.deleteById(id);
    }

    OperatorRole getRoleOrThrow(Long id) {
        return operatorRoleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Role not found: " + id));
    }
}
