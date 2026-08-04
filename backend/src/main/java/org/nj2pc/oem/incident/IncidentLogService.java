package org.nj2pc.oem.incident;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class IncidentLogService {

    private final IncidentLogRepository incidentLogRepository;
    private final IncidentService incidentService;
    private final OperatorRepository operatorRepository;

    public IncidentLogService(IncidentLogRepository incidentLogRepository,
                               IncidentService incidentService,
                               OperatorRepository operatorRepository) {
        this.incidentLogRepository = incidentLogRepository;
        this.incidentService = incidentService;
        this.operatorRepository = operatorRepository;
    }

    public List<IncidentLogResponse> findByIncident(Long incidentId) {
        incidentService.getIncidentOrThrow(incidentId);
        return incidentLogRepository.findByIncidentIdOrderByLoggedAtAsc(incidentId).stream()
                .map(IncidentLogResponse::from).toList();
    }

    @Transactional
    public IncidentLogResponse create(Long incidentId, IncidentLogRequest request) {
        Incident incident = incidentService.getIncidentOrThrow(incidentId);
        Operator from = getOperatorOrThrow(request.operatorId());
        Operator to = request.toOperatorId() != null ? getOperatorOrThrow(request.toOperatorId()) : null;

        IncidentLog log = new IncidentLog();
        log.setIncident(incident);
        log.setOperator(from);
        log.setToOperator(to);
        log.setSubject(request.subject());
        log.setMessage(request.message());
        log.setPriority(request.priority());

        return IncidentLogResponse.from(incidentLogRepository.save(log));
    }

    private Operator getOperatorOrThrow(Long id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + id));
    }
}
