CREATE TABLE operators (
    id              BIGSERIAL PRIMARY KEY,
    callsign        VARCHAR(16) NOT NULL UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    license_class   VARCHAR(20),
    phone           VARCHAR(30),
    email           VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
    operator_id     BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    location        VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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
    type                    VARCHAR(20) NOT NULL,
    identifier              VARCHAR(100) NOT NULL,
    frequency               VARCHAR(50),
    status                  VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    assigned_operator_id    BIGINT REFERENCES operators(id) ON DELETE SET NULL,
    assigned_incident_id    BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
    notes                   TEXT
);

CREATE INDEX idx_incident_logs_incident_id ON incident_logs(incident_id);
CREATE INDEX idx_resources_assigned_incident_id ON resources(assigned_incident_id);
CREATE INDEX idx_users_operator_id ON users(operator_id);
