CREATE TABLE resource_type_fields (
    id                  BIGSERIAL PRIMARY KEY,
    resource_type_id    BIGINT NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    field_type          VARCHAR(20) NOT NULL,
    required            BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order          INT NOT NULL DEFAULT 0,
    options             JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_resource_type_fields_name ON resource_type_fields(resource_type_id, name);
CREATE INDEX idx_resource_type_fields_type ON resource_type_fields(resource_type_id);

ALTER TABLE resources ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
