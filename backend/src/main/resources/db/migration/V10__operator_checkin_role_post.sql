CREATE TABLE operator_roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO operator_roles (name) VALUES
    ('Com-T'),
    ('Com-L'),
    ('Net Control'),
    ('Weather (Skywarn)'),
    ('Radio Operator'),
    ('Logistics');

ALTER TABLE incident_operator_checkins ADD COLUMN role_id BIGINT REFERENCES operator_roles(id);
ALTER TABLE incident_operator_checkins ADD COLUMN post VARCHAR(150);
