-- Tracks operator/resource presence at an incident over time. An incident can
-- span multiple days, so each check-in is its own row (checked_out_at NULL
-- means still on scene); an operator or resource can have several rows
-- against the same incident across different shifts/days.
CREATE TABLE incident_operator_checkins (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    operator_id         BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at      TIMESTAMPTZ,
    notes               TEXT
);

CREATE TABLE incident_resource_checkins (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    resource_id         BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at      TIMESTAMPTZ,
    notes               TEXT
);

CREATE INDEX idx_op_checkins_incident ON incident_operator_checkins(incident_id);
CREATE INDEX idx_op_checkins_operator ON incident_operator_checkins(operator_id);
CREATE INDEX idx_res_checkins_incident ON incident_resource_checkins(incident_id);
CREATE INDEX idx_res_checkins_resource ON incident_resource_checkins(resource_id);

-- At most one open (not yet checked out) check-in per operator/resource per incident.
CREATE UNIQUE INDEX uq_op_checkins_open
    ON incident_operator_checkins(incident_id, operator_id) WHERE checked_out_at IS NULL;
CREATE UNIQUE INDEX uq_res_checkins_open
    ON incident_resource_checkins(incident_id, resource_id) WHERE checked_out_at IS NULL;
