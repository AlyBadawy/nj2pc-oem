CREATE TABLE mesh_sessions (
    id                   BIGSERIAL PRIMARY KEY,
    incident_id          BIGINT NOT NULL REFERENCES incidents(id),
    label                VARCHAR(255),
    captured_at          TIMESTAMPTZ NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_id        BIGINT REFERENCES operators(id),
    local_node_hostname  VARCHAR(255) NOT NULL,
    notes                TEXT
);
CREATE INDEX idx_mesh_sessions_incident ON mesh_sessions(incident_id);

CREATE TABLE mesh_node_snapshots (
    id                    BIGSERIAL PRIMARY KEY,
    mesh_session_id       BIGINT NOT NULL REFERENCES mesh_sessions(id) ON DELETE CASCADE,
    hostname              VARCHAR(255) NOT NULL,
    is_local_node         BOOLEAN NOT NULL DEFAULT false,
    mac_address           VARCHAR(64),
    mesh_ip_address       VARCHAR(64),
    link_local_address    VARCHAR(64),
    model                 VARCHAR(255),
    firmware_version      VARCHAR(255),
    latitude              VARCHAR(50),
    longitude             VARCHAR(50),
    claimed_distance_mi   VARCHAR(50),
    channel               VARCHAR(50),
    band                  VARCHAR(50),
    frequency_mhz         VARCHAR(50),
    channel_width         VARCHAR(50),
    rf_power_dbm          VARCHAR(50),
    resource_id           BIGINT REFERENCES resources(id),
    raw_json              JSONB,
    UNIQUE (mesh_session_id, hostname)
);
CREATE INDEX idx_mesh_node_snapshots_session ON mesh_node_snapshots(mesh_session_id);

CREATE TABLE mesh_link_snapshots (
    id                     BIGSERIAL PRIMARY KEY,
    mesh_session_id        BIGINT NOT NULL REFERENCES mesh_sessions(id) ON DELETE CASCADE,
    from_hostname          VARCHAR(255) NOT NULL,
    to_hostname            VARCHAR(255) NOT NULL,
    to_mac_address         VARCHAR(64),
    source_section         VARCHAR(20) NOT NULL,
    link_type_normalized   VARCHAR(20) NOT NULL,
    raw_link_type          VARCHAR(255),
    link_quality_status    VARCHAR(50),
    rx_percent             VARCHAR(20),
    rtt_ms                 VARCHAR(20),
    snr                    VARCHAR(20),
    n_snr                  VARCHAR(20),
    errors_percent         VARCHAR(20),
    mbps                   VARCHAR(20),
    distance_miles         VARCHAR(20),
    rx_success_percent     VARCHAR(20),
    tx_success_percent     VARCHAR(20),
    rx_cost                VARCHAR(20),
    tx_cost                VARCHAR(20),
    ping_time_ms           VARCHAR(20),
    ping_success_percent   VARCHAR(20),
    avg_tx                 VARCHAR(50),
    raw_json               JSONB
);
CREATE INDEX idx_mesh_link_snapshots_session ON mesh_link_snapshots(mesh_session_id);

CREATE TABLE mesh_lan_client_snapshots (
    id                BIGSERIAL PRIMARY KEY,
    mesh_session_id   BIGINT NOT NULL REFERENCES mesh_sessions(id) ON DELETE CASCADE,
    node_hostname     VARCHAR(255) NOT NULL,
    device_hostname   VARCHAR(255) NOT NULL,
    device_url        VARCHAR(500)
);
CREATE INDEX idx_mesh_lan_client_snapshots_session ON mesh_lan_client_snapshots(mesh_session_id);

ALTER TABLE incidents
    ADD COLUMN latitude  VARCHAR(50),
    ADD COLUMN longitude VARCHAR(50);
