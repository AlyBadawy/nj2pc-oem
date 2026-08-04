CREATE TABLE communication_plans (
    id                          BIGSERIAL PRIMARY KEY,
    name                        VARCHAR(200) NOT NULL,
    operational_period_start    TIMESTAMPTZ,
    operational_period_end      TIMESTAMPTZ,
    special_instructions        TEXT,
    prepared_by_name            VARCHAR(150),
    prepared_by_callsign        VARCHAR(16),
    prepared_at                 TIMESTAMPTZ,
    approved_by_name            VARCHAR(150),
    approved_by_callsign        VARCHAR(16),
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE communication_channels (
    id                      BIGSERIAL PRIMARY KEY,
    communication_plan_id   BIGINT NOT NULL REFERENCES communication_plans(id) ON DELETE CASCADE,
    zone_group              VARCHAR(50) NOT NULL,
    channel_number          INT NOT NULL,
    function                VARCHAR(100) NOT NULL,
    channel_name            VARCHAR(150) NOT NULL,
    assignment              TEXT,
    rx_frequency            VARCHAR(50),
    rx_tone                 VARCHAR(50),
    tx_frequency             VARCHAR(50),
    tx_tone                 VARCHAR(50),
    mode                    VARCHAR(10) NOT NULL DEFAULT 'ANALOG',
    remarks                 TEXT
);

-- Many-to-many: a communications plan may cover multiple incidents, and an
-- incident may be covered by multiple plans (e.g. a primary plan plus a
-- backup/overflow plan).
CREATE TABLE incident_communication_plans (
    incident_id             BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    communication_plan_id   BIGINT NOT NULL REFERENCES communication_plans(id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, communication_plan_id)
);

CREATE INDEX idx_comm_channels_plan_id ON communication_channels(communication_plan_id);
CREATE INDEX idx_incident_comm_plans_plan_id ON incident_communication_plans(communication_plan_id);
