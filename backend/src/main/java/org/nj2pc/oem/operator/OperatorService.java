package org.nj2pc.oem.operator;

import org.nj2pc.oem.common.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OperatorService {

    private final OperatorRepository operatorRepository;
    private final PasswordEncoder passwordEncoder;

    public OperatorService(OperatorRepository operatorRepository, PasswordEncoder passwordEncoder) {
        this.operatorRepository = operatorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<OperatorResponse> findAll() {
        return operatorRepository.findAll().stream().map(OperatorResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OperatorResponse findById(Long id) {
        return OperatorResponse.from(getOperatorOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<OperatorSummaryResponse> findAllSummary() {
        return operatorRepository.findAll().stream().map(OperatorSummaryResponse::from).toList();
    }

    @Transactional
    public OperatorResponse create(OperatorRequest request, String creatorCallsign) {
        if (operatorRepository.existsByCallsignIgnoreCase(request.callsign())) {
            throw ApiException.conflict("Callsign already registered: " + request.callsign());
        }
        if (request.password() == null || request.password().isBlank()) {
            throw ApiException.badRequest("Password is required");
        }
        Operator operator = new Operator();
        applyRequest(operator, request);
        if (creatorCallsign != null) {
            operatorRepository.findByCallsignIgnoreCase(creatorCallsign).ifPresent(operator::setCreatedBy);
        }
        return OperatorResponse.from(operatorRepository.save(operator));
    }

    @Transactional
    public OperatorResponse update(Long id, OperatorRequest request) {
        Operator operator = getOperatorOrThrow(id);
        if (!operator.getCallsign().equalsIgnoreCase(request.callsign())
                && operatorRepository.existsByCallsignIgnoreCase(request.callsign())) {
            throw ApiException.conflict("Callsign already registered: " + request.callsign());
        }
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
        operator.setName(request.name());
        operator.setLicenseClass(request.licenseClass());
        operator.getDmrIds().clear();
        if (request.dmrIds() != null) {
            operator.getDmrIds().addAll(request.dmrIds());
        }
        operator.setPhone(request.phone());
        operator.setEmail(request.email());
        operator.setStatus(request.status());
        operator.setNotes(request.notes());
        operator.setAddressLine1(request.addressLine1());
        operator.setAddressLine2(request.addressLine2());
        operator.setAddressAttn(request.addressAttn());
        operator.setLatitude(request.latitude());
        operator.setLongitude(request.longitude());
        operator.setGridSquare(request.gridSquare());
        operator.setAccessLevel(request.accessLevel());
        if (request.password() != null && !request.password().isBlank()) {
            operator.setPasswordHash(passwordEncoder.encode(request.password()));
        }
    }
}
