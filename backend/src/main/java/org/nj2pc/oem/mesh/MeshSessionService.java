package org.nj2pc.oem.mesh;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.PermissionGuard;
import org.nj2pc.oem.resource.Resource;
import org.nj2pc.oem.resource.ResourceRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class MeshSessionService {

    private final MeshSessionRepository meshSessionRepository;
    private final MeshNodeSnapshotRepository meshNodeSnapshotRepository;
    private final MeshLinkSnapshotRepository meshLinkSnapshotRepository;
    private final MeshLanClientSnapshotRepository meshLanClientSnapshotRepository;
    private final IncidentRepository incidentRepository;
    private final ResourceRepository resourceRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public MeshSessionService(MeshSessionRepository meshSessionRepository,
                               MeshNodeSnapshotRepository meshNodeSnapshotRepository,
                               MeshLinkSnapshotRepository meshLinkSnapshotRepository,
                               MeshLanClientSnapshotRepository meshLanClientSnapshotRepository,
                               IncidentRepository incidentRepository,
                               ResourceRepository resourceRepository,
                               PermissionGuard permissionGuard,
                               AuditLogService auditLogService) {
        this.meshSessionRepository = meshSessionRepository;
        this.meshNodeSnapshotRepository = meshNodeSnapshotRepository;
        this.meshLinkSnapshotRepository = meshLinkSnapshotRepository;
        this.meshLanClientSnapshotRepository = meshLanClientSnapshotRepository;
        this.incidentRepository = incidentRepository;
        this.resourceRepository = resourceRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<MeshSessionSummaryResponse> findByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw ApiException.notFound("Incident not found: " + incidentId);
        }
        return meshSessionRepository.findByIncidentIdOrderByCapturedAtDesc(incidentId).stream()
                .map(s -> new MeshSessionSummaryResponse(
                        s.getId(), s.getIncident().getId(), s.getLabel(), s.getCapturedAt(),
                        s.getCreatedBy() != null ? s.getCreatedBy().getCallsign() : null,
                        s.getLocalNodeHostname(),
                        meshNodeSnapshotRepository.countBySessionId(s.getId()),
                        meshLinkSnapshotRepository.countBySessionId(s.getId())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public MeshSessionDetailResponse findById(Long incidentId, Long sessionId) {
        MeshSession session = getSessionOrThrow(incidentId, sessionId);
        List<MeshNodeSnapshotResponse> nodes = meshNodeSnapshotRepository.findBySessionId(sessionId).stream()
                .map(MeshNodeSnapshotResponse::from).toList();
        List<MeshLinkSnapshotResponse> links = meshLinkSnapshotRepository.findBySessionId(sessionId).stream()
                .map(MeshLinkSnapshotResponse::from).toList();
        List<MeshLanClientSnapshotResponse> lanClients = meshLanClientSnapshotRepository.findBySessionId(sessionId).stream()
                .map(MeshLanClientSnapshotResponse::from).toList();
        return new MeshSessionDetailResponse(
                session.getId(), session.getIncident().getId(), session.getLabel(), session.getCapturedAt(),
                session.getCreatedBy() != null ? session.getCreatedBy().getCallsign() : null,
                session.getLocalNodeHostname(), session.getNotes(), nodes, links, lanClients
        );
    }

    @Transactional
    public MeshSessionDetailResponse submit(Authentication authentication, Long incidentId, MeshSessionSubmitRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        Operator caller = permissionGuard.requireCaller(authentication);

        MeshSession session = new MeshSession();
        session.setIncident(incident);
        session.setLabel(request.label());
        session.setCapturedAt(request.capturedAt() != null ? request.capturedAt() : Instant.now());
        session.setCreatedBy(caller);
        session.setLocalNodeHostname(request.localNodeHostname());
        session.setNotes(request.notes());
        session = meshSessionRepository.save(session);

        for (MeshSessionSubmitRequest.NodeInput input : request.nodes()) {
            MeshNodeSnapshot node = new MeshNodeSnapshot();
            node.setSession(session);
            node.setHostname(input.hostname());
            node.setLocalNode(input.isLocalNode());
            node.setMacAddress(input.macAddress());
            node.setMeshIpAddress(input.meshIpAddress());
            node.setLinkLocalAddress(input.linkLocalAddress());
            node.setModel(input.model());
            node.setFirmwareVersion(input.firmwareVersion());
            node.setLatitude(input.latitude());
            node.setLongitude(input.longitude());
            node.setClaimedDistanceMi(input.claimedDistanceMi());
            node.setChannel(input.channel());
            node.setBand(input.band());
            node.setFrequencyMhz(input.frequencyMhz());
            node.setChannelWidth(input.channelWidth());
            node.setRfPowerDbm(input.rfPowerDbm());
            node.setRawJson(input.rawJson());
            resourceRepository.findByIdentifierIgnoreCase(input.hostname()).ifPresent(node::setResource);
            meshNodeSnapshotRepository.save(node);
        }

        for (MeshSessionSubmitRequest.LinkInput input : request.links()) {
            MeshLinkSnapshot link = new MeshLinkSnapshot();
            link.setSession(session);
            link.setFromHostname(input.fromHostname());
            link.setToHostname(input.toHostname());
            link.setToMacAddress(input.toMacAddress());
            link.setSourceSection(input.sourceSection());
            link.setLinkTypeNormalized(input.linkTypeNormalized());
            link.setRawLinkType(input.rawLinkType());
            link.setLinkQualityStatus(input.linkQualityStatus());
            link.setRxPercent(input.rxPercent());
            link.setRttMs(input.rttMs());
            link.setSnr(input.snr());
            link.setNSnr(input.nSnr());
            link.setErrorsPercent(input.errorsPercent());
            link.setMbps(input.mbps());
            link.setDistanceMiles(input.distanceMiles());
            link.setRxSuccessPercent(input.rxSuccessPercent());
            link.setTxSuccessPercent(input.txSuccessPercent());
            link.setRxCost(input.rxCost());
            link.setTxCost(input.txCost());
            link.setPingTimeMs(input.pingTimeMs());
            link.setPingSuccessPercent(input.pingSuccessPercent());
            link.setAvgTx(input.avgTx());
            link.setRawJson(input.rawJson());
            meshLinkSnapshotRepository.save(link);
        }

        if (request.lanClients() != null) {
            for (MeshSessionSubmitRequest.LanClientInput input : request.lanClients()) {
                MeshLanClientSnapshot client = new MeshLanClientSnapshot();
                client.setSession(session);
                client.setNodeHostname(input.nodeHostname());
                client.setDeviceHostname(input.deviceHostname());
                client.setDeviceUrl(input.deviceUrl());
                meshLanClientSnapshotRepository.save(client);
            }
        }

        auditLogService.record(EntityType.INCIDENT, incidentId, "MESH_SCAN",
                "Recorded a mesh scan (" + request.nodes().size() + " nodes, " + request.links().size() + " links) from "
                        + request.localNodeHostname(), authentication.getName());

        return findById(incidentId, session.getId());
    }

    private MeshSession getSessionOrThrow(Long incidentId, Long sessionId) {
        MeshSession session = meshSessionRepository.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("Mesh session not found: " + sessionId));
        if (!session.getIncident().getId().equals(incidentId)) {
            throw ApiException.notFound("Mesh session not found on incident " + incidentId + ": " + sessionId);
        }
        return session;
    }
}
