package org.nj2pc.oem.resource;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.operator.Operator;

@Entity
@Table(name = "resources")
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceType type;

    @Column(nullable = false)
    private String identifier;

    private String frequency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus status = ResourceStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_operator_id")
    private Operator assignedOperator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_incident_id")
    private Incident assignedIncident;

    private String notes;

    public Long getId() {
        return id;
    }

    public ResourceType getType() {
        return type;
    }

    public void setType(ResourceType type) {
        this.type = type;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public ResourceStatus getStatus() {
        return status;
    }

    public void setStatus(ResourceStatus status) {
        this.status = status;
    }

    public Operator getAssignedOperator() {
        return assignedOperator;
    }

    public void setAssignedOperator(Operator assignedOperator) {
        this.assignedOperator = assignedOperator;
    }

    public Incident getAssignedIncident() {
        return assignedIncident;
    }

    public void setAssignedIncident(Incident assignedIncident) {
        this.assignedIncident = assignedIncident;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
