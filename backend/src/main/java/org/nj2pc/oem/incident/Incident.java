package org.nj2pc.oem.incident;

import jakarta.persistence.*;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status = IncidentStatus.PLANNED;

    @Column(name = "planned_start_time")
    private Instant plannedStartTime;

    @Column(name = "planned_end_time")
    private Instant plannedEndTime;

    @Column(name = "actual_start_time")
    private Instant actualStartTime;

    @Column(name = "actual_end_time")
    private Instant actualEndTime;

    private String description;

    private String latitude;

    private String longitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private Operator createdBy;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public void setStatus(IncidentStatus status) {
        this.status = status;
    }

    public Instant getPlannedStartTime() {
        return plannedStartTime;
    }

    public void setPlannedStartTime(Instant plannedStartTime) {
        this.plannedStartTime = plannedStartTime;
    }

    public Instant getPlannedEndTime() {
        return plannedEndTime;
    }

    public void setPlannedEndTime(Instant plannedEndTime) {
        this.plannedEndTime = plannedEndTime;
    }

    public Instant getActualStartTime() {
        return actualStartTime;
    }

    public void setActualStartTime(Instant actualStartTime) {
        this.actualStartTime = actualStartTime;
    }

    public Instant getActualEndTime() {
        return actualEndTime;
    }

    public void setActualEndTime(Instant actualEndTime) {
        this.actualEndTime = actualEndTime;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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
