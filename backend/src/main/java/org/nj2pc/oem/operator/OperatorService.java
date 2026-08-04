package org.nj2pc.oem.operator;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OperatorService {

    private final OperatorRepository operatorRepository;

    public OperatorService(OperatorRepository operatorRepository) {
        this.operatorRepository = operatorRepository;
    }

    public List<OperatorResponse> findAll() {
        return operatorRepository.findAll().stream().map(OperatorResponse::from).toList();
    }

    public OperatorResponse findById(Long id) {
        return OperatorResponse.from(getOperatorOrThrow(id));
    }

    @Transactional
    public OperatorResponse create(OperatorRequest request) {
        if (operatorRepository.existsByCallsign(request.callsign())) {
            throw ApiException.conflict("Callsign already registered: " + request.callsign());
        }
        Operator operator = new Operator();
        applyRequest(operator, request);
        return OperatorResponse.from(operatorRepository.save(operator));
    }

    @Transactional
    public OperatorResponse update(Long id, OperatorRequest request) {
        Operator operator = getOperatorOrThrow(id);
        applyRequest(operator, request);
        return OperatorResponse.from(operatorRepository.save(operator));
    }

    @Transactional
    public void delete(Long id) {
        if (!operatorRepository.existsById(id)) {
            throw ApiException.notFound("Operator not found: " + id);
        }
        operatorRepository.deleteById(id);
    }

    Operator getOperatorOrThrow(Long id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + id));
    }

    private void applyRequest(Operator operator, OperatorRequest request) {
        operator.setCallsign(request.callsign());
        operator.setFirstName(request.firstName());
        operator.setLastName(request.lastName());
        operator.setLicenseClass(request.licenseClass());
        operator.setPhone(request.phone());
        operator.setEmail(request.email());
        operator.setStatus(request.status());
        operator.setNotes(request.notes());
    }
}
