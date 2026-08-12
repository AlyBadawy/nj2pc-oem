package org.nj2pc.oem.auditlog;

import jakarta.persistence.*;
import org.nj2pc.oem.operator.Operator;

import java.time.Instant;

@Entity
@Table(name = "audit_log_entries")
public class AuditLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    private EntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String summary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id")
    private Operator performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt = Instant.now();

    @Column(name = "performed_ip")
    private String performedIp;

    public Long getId() {
        return id;
    }

    public EntityType getEntityType() {
        return entityType;
    }

    public void setEntityType(EntityType entityType) {
        this.entityType = entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Operator getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(Operator performedBy) {
        this.performedBy = performedBy;
    }

    public Instant getPerformedAt() {
        return performedAt;
    }

    public String getPerformedIp() {
        return performedIp;
    }

    public void setPerformedIp(String performedIp) {
        this.performedIp = performedIp;
    }
}
