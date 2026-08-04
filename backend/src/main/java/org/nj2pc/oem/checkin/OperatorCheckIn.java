package org.nj2pc.oem.checkin;

import jakarta.persistence.*;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "incident_operator_checkins")
public class OperatorCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_id", nullable = false)
    private Operator operator;

    @Column(name = "checked_in_at", nullable = false)
    private Instant checkedInAt = Instant.now();

    @Column(name = "checked_out_at")
    private Instant checkedOutAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private OperatorRole role;

    private String post;

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

    public Operator getOperator() {
        return operator;
    }

    public void setOperator(Operator operator) {
        this.operator = operator;
    }

    public Instant getCheckedInAt() {
        return checkedInAt;
    }

    public void setCheckedInAt(Instant checkedInAt) {
        this.checkedInAt = checkedInAt;
    }

    public Instant getCheckedOutAt() {
        return checkedOutAt;
    }

    public void setCheckedOutAt(Instant checkedOutAt) {
        this.checkedOutAt = checkedOutAt;
    }

    public OperatorRole getRole() {
        return role;
    }

    public void setRole(OperatorRole role) {
        this.role = role;
    }

    public String getPost() {
        return post;
    }

    public void setPost(String post) {
        this.post = post;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
