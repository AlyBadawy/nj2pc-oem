ALTER TABLE communication_plans
    ADD COLUMN version      INT NOT NULL DEFAULT 1,
    ADD COLUMN root_plan_id BIGINT REFERENCES communication_plans(id),
    ADD COLUMN active       BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE communication_plans SET root_plan_id = id WHERE root_plan_id IS NULL;

CREATE TABLE incident_comms_plan_applications (
    id                      BIGSERIAL PRIMARY KEY,
    incident_id             BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    communication_plan_id   BIGINT NOT NULL REFERENCES communication_plans(id) ON DELETE CASCADE,
    applied_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_by_id           BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    revoked_at              TIMESTAMPTZ,
    revoked_by_id           BIGINT REFERENCES operators(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_incident_comms_plan_active
    ON incident_comms_plan_applications(incident_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_incident_comms_plan_incident ON incident_comms_plan_applications(incident_id);
