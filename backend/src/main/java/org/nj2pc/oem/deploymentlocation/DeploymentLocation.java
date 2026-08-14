package org.nj2pc.oem.deploymentlocation;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "deployment_locations")
public class DeploymentLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(nullable = false)
    private String name;

    private String latitude;

    private String longitude;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private Operator createdBy;

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public void setIncident(Incident incident) {
        this.incident = incident;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
}
