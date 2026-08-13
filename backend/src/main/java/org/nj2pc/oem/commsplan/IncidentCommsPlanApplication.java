package org.nj2pc.oem.commsplan;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "incident_comms_plan_applications")
public class IncidentCommsPlanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "communication_plan_id", nullable = false)
    private CommunicationPlan communicationPlan;

    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_by_id")
    private Operator appliedBy;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revoked_by_id")
    private Operator revokedBy;

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public void setIncident(Incident incident) {
        this.incident = incident;
    }

    public CommunicationPlan getCommunicationPlan() {
        return communicationPlan;
    }

    public void setCommunicationPlan(CommunicationPlan communicationPlan) {
        this.communicationPlan = communicationPlan;
    }

    public Instant getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(Instant appliedAt) {
        this.appliedAt = appliedAt;
    }

    public Operator getAppliedBy() {
        return appliedBy;
    }

    public void setAppliedBy(Operator appliedBy) {
        this.appliedBy = appliedBy;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public Operator getRevokedBy() {
        return revokedBy;
    }

    public void setRevokedBy(Operator revokedBy) {
        this.revokedBy = revokedBy;
    }
}
