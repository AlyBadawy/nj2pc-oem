package org.nj2pc.oem.incident;

import jakarta.persistence.*;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "incident_logs")
public class IncidentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id")
    private Operator operator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_operator_id")
    private Operator toOperator;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.ROUTINE;

    @Column(name = "logged_at", nullable = false)
    private Instant loggedAt = Instant.now();

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

    public Operator getToOperator() {
        return toOperator;
    }

    public void setToOperator(Operator toOperator) {
        this.toOperator = toOperator;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public Instant getLoggedAt() {
        return loggedAt;
    }
}
