package org.nj2pc.oem.mesh;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "mesh_sessions")
public class MeshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    private String label;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private Operator createdBy;

    @Column(name = "local_node_hostname", nullable = false)
    private String localNodeHostname;

    private String notes;

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public void setIncident(Incident incident) {
        this.incident = incident;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Instant capturedAt) {
        this.capturedAt = capturedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Operator getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Operator createdBy) {
        this.createdBy = createdBy;
    }

    public String getLocalNodeHostname() {
        return localNodeHostname;
    }

    public void setLocalNodeHostname(String localNodeHostname) {
        this.localNodeHostname = localNodeHostname;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
