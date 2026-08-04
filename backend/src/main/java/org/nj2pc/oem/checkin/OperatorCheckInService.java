package org.nj2pc.oem.checkin;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.incident.IncidentStatus;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class OperatorCheckInService {

    private final OperatorCheckInRepository operatorCheckInRepository;
    private final IncidentRepository incidentRepository;
    private final OperatorRepository operatorRepository;
    private final OperatorRoleRepository operatorRoleRepository;

    public OperatorCheckInService(OperatorCheckInRepository operatorCheckInRepository,
                                   IncidentRepository incidentRepository,
                                   OperatorRepository operatorRepository,
                                   OperatorRoleRepository operatorRoleRepository) {
        this.operatorCheckInRepository = operatorCheckInRepository;
        this.incidentRepository = incidentRepository;
        this.operatorRepository = operatorRepository;
        this.operatorRoleRepository = operatorRoleRepository;
    }

    @Transactional(readOnly = true)
    public List<OperatorCheckInResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return operatorCheckInRepository.findByIncidentIdOrderByCheckedInAtDesc(incidentId).stream()
                .map(OperatorCheckInResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OperatorCheckInResponse> findAllOpen() {
        return operatorCheckInRepository.findByCheckedOutAtIsNull().stream()
                .map(OperatorCheckInResponse::from).toList();
    }

    @Transactional
    public OperatorCheckInResponse checkIn(Long incidentId, OperatorCheckInRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw ApiException.badRequest("Cannot check in to a closed incident");
        }
        Operator operator = operatorRepository.findById(request.operatorId())
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.operatorId()));

        operatorCheckInRepository.findByIncidentIdAndOperatorIdAndCheckedOutAtIsNull(incidentId, request.operatorId())
                .ifPresent(existing -> {
                    throw ApiException.conflict(operator.getCallsign() + " is already checked in to this incident");
                });

        OperatorCheckIn checkIn = new OperatorCheckIn();
        checkIn.setIncident(incident);
        checkIn.setOperator(operator);
        checkIn.setCheckedInAt(Instant.now());
        if (request.roleId() != null) {
            OperatorRole role = operatorRoleRepository.findById(request.roleId())
                    .orElseThrow(() -> ApiException.notFound("Role not found: " + request.roleId()));
            checkIn.setRole(role);
        }
        checkIn.setPost(request.post());
        checkIn.setNotes(request.notes());
        return OperatorCheckInResponse.from(operatorCheckInRepository.save(checkIn));
    }

    @Transactional
    public OperatorCheckInResponse checkOut(Long incidentId, Long checkInId) {
        OperatorCheckIn checkIn = getCheckInOrThrow(incidentId, checkInId);
        if (checkIn.getCheckedOutAt() != null) {
            throw ApiException.badRequest("Already checked out");
        }
        checkIn.setCheckedOutAt(Instant.now());
        return OperatorCheckInResponse.from(operatorCheckInRepository.save(checkIn));
    }

    @Transactional
    public void checkOutAllOpen(Long incidentId) {
        Instant now = Instant.now();
        List<OperatorCheckIn> open = operatorCheckInRepository.findByIncidentIdAndCheckedOutAtIsNull(incidentId);
        open.forEach(c -> c.setCheckedOutAt(now));
        operatorCheckInRepository.saveAll(open);
    }

    private OperatorCheckIn getCheckInOrThrow(Long incidentId, Long checkInId) {
        OperatorCheckIn checkIn = operatorCheckInRepository.findById(checkInId)
                .orElseThrow(() -> ApiException.notFound("Check-in not found: " + checkInId));
        if (!checkIn.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Check-in not found on incident " + incidentId + ": " + checkInId);
        }
        return checkIn;
    }
}
