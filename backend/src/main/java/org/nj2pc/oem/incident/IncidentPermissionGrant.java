package org.nj2pc.oem.incident;

import jakarta.persistence.*;
import org.nj2pc.oem.operator.Operator;

@Entity
@Table(name = "incident_permission_grants")
public class IncidentPermissionGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_id", nullable = false)
    private Operator operator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentPermission permission;

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

    public IncidentPermission getPermission() {
        return permission;
    }

    public void setPermission(IncidentPermission permission) {
        this.permission = permission;
    }
}
