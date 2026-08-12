CREATE TABLE operators (
    id                      BIGSERIAL PRIMARY KEY,
    callsign                VARCHAR(16) NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    license_class           VARCHAR(20),
    phone                   VARCHAR(30),
    email                   VARCHAR(255),
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes                   TEXT,
    address_line1           VARCHAR(255),
    address_line2           VARCHAR(255),
    address_attn            VARCHAR(100),
    latitude                VARCHAR(20),
    longitude               VARCHAR(20),
    grid_square             VARCHAR(10),
    password_hash           VARCHAR(255),
    access_level            VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    created_by_id           BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operator_dmr_ids (
    operator_id BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    sort_order  INT NOT NULL,
    dmr_id      VARCHAR(20) NOT NULL,
    PRIMARY KEY (operator_id, sort_order)
);

CREATE TABLE operator_roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
    id                          BIGSERIAL PRIMARY KEY,
    name                        VARCHAR(200) NOT NULL,
    location                    VARCHAR(255),
    status                      VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    planned_start_time          TIMESTAMPTZ,
    planned_end_time            TIMESTAMPTZ,
    actual_start_time           TIMESTAMPTZ,
    actual_end_time             TIMESTAMPTZ,
    description                 TEXT,
    created_by_id               BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
    id                      BIGSERIAL PRIMARY KEY,
    operator_id             BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    year                    INT NOT NULL,
    make                    VARCHAR(100) NOT NULL,
    model                   VARCHAR(100) NOT NULL,
    color                   VARCHAR(50),
    license_plate_number    VARCHAR(20) NOT NULL,
    license_plate_state     VARCHAR(20) NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incident_logs (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    operator_id         BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    to_operator_id      BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    subject             VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'ROUTINE',
    logged_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resources (
    id                      BIGSERIAL PRIMARY KEY,
    resource_type_id        BIGINT NOT NULL REFERENCES resource_types(id),
    identifier              VARCHAR(100) NOT NULL,
    serial_number           VARCHAR(100),
    owner_operator_id       BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    notes                   TEXT
);

CREATE TABLE incident_operator_checkins (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    operator_id         BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at      TIMESTAMPTZ,
    role_id             BIGINT REFERENCES operator_roles(id) ON DELETE SET NULL,
    post                VARCHAR(150),
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
    tx_frequency            VARCHAR(50),
    tx_tone                 VARCHAR(50),
    mode                    VARCHAR(10) NOT NULL DEFAULT 'ANALOG',
    remarks                 TEXT
);

CREATE TABLE incident_communication_plans (
    incident_id             BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    communication_plan_id   BIGINT NOT NULL REFERENCES communication_plans(id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, communication_plan_id)
);

CREATE UNIQUE INDEX uq_operators_callsign_ci ON operators (UPPER(callsign));

CREATE INDEX idx_vehicles_operator_id ON vehicles(operator_id);
CREATE INDEX idx_incident_logs_incident_id ON incident_logs(incident_id);
CREATE INDEX idx_op_checkins_incident ON incident_operator_checkins(incident_id);
CREATE INDEX idx_op_checkins_operator ON incident_operator_checkins(operator_id);
CREATE INDEX idx_res_checkins_incident ON incident_resource_checkins(incident_id);
CREATE INDEX idx_res_checkins_resource ON incident_resource_checkins(resource_id);
CREATE INDEX idx_comm_channels_plan_id ON communication_channels(communication_plan_id);
CREATE INDEX idx_incident_comm_plans_plan_id ON incident_communication_plans(communication_plan_id);

CREATE UNIQUE INDEX uq_op_checkins_open
    ON incident_operator_checkins(incident_id, operator_id) WHERE checked_out_at IS NULL;
CREATE UNIQUE INDEX uq_res_checkins_open
    ON incident_resource_checkins(incident_id, resource_id) WHERE checked_out_at IS NULL;
