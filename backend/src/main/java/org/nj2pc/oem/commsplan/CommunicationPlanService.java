package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommunicationPlanService {

    private final CommunicationPlanRepository communicationPlanRepository;
    private final IncidentRepository incidentRepository;

    public CommunicationPlanService(CommunicationPlanRepository communicationPlanRepository,
                                     IncidentRepository incidentRepository) {
        this.communicationPlanRepository = communicationPlanRepository;
        this.incidentRepository = incidentRepository;
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findAll() {
        return communicationPlanRepository.findAll().stream().map(CommunicationPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CommunicationPlanResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return communicationPlanRepository.findByIncidents_Id(incidentId).stream()
                .map(CommunicationPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CommunicationPlanResponse findById(Long id) {
        return CommunicationPlanResponse.from(getPlanOrThrow(id));
    }

    @Transactional
    public CommunicationPlanResponse create(CommunicationPlanRequest request) {
        CommunicationPlan plan = new CommunicationPlan();
        applyRequest(plan, request);
        return CommunicationPlanResponse.from(communicationPlanRepository.save(plan));
    }

    @Transactional
    public CommunicationPlanResponse update(Long id, CommunicationPlanRequest request) {
        CommunicationPlan plan = getPlanOrThrow(id);
        applyRequest(plan, request);
        return CommunicationPlanResponse.from(communicationPlanRepository.save(plan));
    }

    @Transactional
    public void delete(Long id) {
        if (!communicationPlanRepository.existsById(id)) {
            throw ApiException.notFound("Communication plan not found: " + id);
        }
        communicationPlanRepository.deleteById(id);
    }

    @Transactional
    public CommunicationPlanResponse linkIncident(Long planId, Long incidentId) {
        CommunicationPlan plan = getPlanOrThrow(planId);
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        plan.getIncidents().add(incident);
        return CommunicationPlanResponse.from(communicationPlanRepository.save(plan));
    }

    @Transactional
    public CommunicationPlanResponse unlinkIncident(Long planId, Long incidentId) {
        CommunicationPlan plan = getPlanOrThrow(planId);
        plan.getIncidents().removeIf(i -> i.getId().equals(incidentId));
        return CommunicationPlanResponse.from(communicationPlanRepository.save(plan));
    }

    CommunicationPlan getPlanOrThrow(Long id) {
        return communicationPlanRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Communication plan not found: " + id));
    }

    private void applyRequest(CommunicationPlan plan, CommunicationPlanRequest request) {
        plan.setName(request.name());
        plan.setOperationalPeriodStart(request.operationalPeriodStart());
        plan.setOperationalPeriodEnd(request.operationalPeriodEnd());
        plan.setSpecialInstructions(request.specialInstructions());
        plan.setPreparedByName(request.preparedByName());
        plan.setPreparedByCallsign(request.preparedByCallsign());
        plan.setPreparedAt(request.preparedAt());
        plan.setApprovedByName(request.approvedByName());
        plan.setApprovedByCallsign(request.approvedByCallsign());
        plan.setApprovedAt(request.approvedAt());
    }
}
