package org.nj2pc.oem.commsplan;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "communication_plans")
public class CommunicationPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "operational_period_start")
    private Instant operationalPeriodStart;

    @Column(name = "operational_period_end")
    private Instant operationalPeriodEnd;

    @Column(name = "special_instructions")
    private String specialInstructions;

    @Column(name = "prepared_by_name")
    private String preparedByName;

    @Column(name = "prepared_by_callsign")
    private String preparedByCallsign;

    @Column(name = "prepared_at")
    private Instant preparedAt;

    @Column(name = "approved_by_name")
    private String approvedByName;

    @Column(name = "approved_by_callsign")
    private String approvedByCallsign;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private int version = 1;

    @Column(name = "root_plan_id")
    private Long rootPlanId;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToMany
    @JoinTable(
            name = "incident_communication_plans",
            joinColumns = @JoinColumn(name = "communication_plan_id"),
            inverseJoinColumns = @JoinColumn(name = "incident_id")
    )
    private Set<Incident> incidents = new HashSet<>();

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Instant getOperationalPeriodStart() {
        return operationalPeriodStart;
    }

    public void setOperationalPeriodStart(Instant operationalPeriodStart) {
        this.operationalPeriodStart = operationalPeriodStart;
    }

    public Instant getOperationalPeriodEnd() {
        return operationalPeriodEnd;
    }

    public void setOperationalPeriodEnd(Instant operationalPeriodEnd) {
        this.operationalPeriodEnd = operationalPeriodEnd;
    }

    public String getSpecialInstructions() {
        return specialInstructions;
    }

    public void setSpecialInstructions(String specialInstructions) {
        this.specialInstructions = specialInstructions;
    }

    public String getPreparedByName() {
        return preparedByName;
    }

    public void setPreparedByName(String preparedByName) {
        this.preparedByName = preparedByName;
    }

    public String getPreparedByCallsign() {
        return preparedByCallsign;
    }

    public void setPreparedByCallsign(String preparedByCallsign) {
        this.preparedByCallsign = preparedByCallsign;
    }

    public Instant getPreparedAt() {
        return preparedAt;
    }

    public void setPreparedAt(Instant preparedAt) {
        this.preparedAt = preparedAt;
    }

    public String getApprovedByName() {
        return approvedByName;
    }

    public void setApprovedByName(String approvedByName) {
        this.approvedByName = approvedByName;
    }

    public String getApprovedByCallsign() {
        return approvedByCallsign;
    }

    public void setApprovedByCallsign(String approvedByCallsign) {
        this.approvedByCallsign = approvedByCallsign;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Set<Incident> getIncidents() {
        return incidents;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Long getRootPlanId() {
        return rootPlanId;
    }

    public void setRootPlanId(Long rootPlanId) {
        this.rootPlanId = rootPlanId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
