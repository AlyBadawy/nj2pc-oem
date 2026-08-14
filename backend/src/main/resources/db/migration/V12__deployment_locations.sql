-- A named, reusable GPS point within an incident (e.g. "Main Stage", "Repeater Site A") that
-- multiple pieces of gear can be deployed to together — the "deploy multiple gear at one
-- location" workflow previously duplicated the same raw lat/lng string across every check-in
-- row instead of sharing one record.
CREATE TABLE deployment_locations (
    id             BIGSERIAL PRIMARY KEY,
    incident_id    BIGINT NOT NULL REFERENCES incidents(id),
    name           VARCHAR(255) NOT NULL,
    latitude       VARCHAR(50),
    longitude      VARCHAR(50),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_id  BIGINT REFERENCES operators(id)
);
CREATE INDEX idx_deployment_locations_incident ON deployment_locations(incident_id);

-- A check-in optionally references the shared location it was deployed to. The many-to-many
-- between deployment_locations and resources is realized through this join (a location has many
-- check-ins across many resources; a resource has many check-ins, possibly at many locations)
-- rather than a separate join table, so "what's deployed where right now" stays driven by the
-- single source of truth check-ins already are.
ALTER TABLE incident_resource_checkins
    ADD COLUMN deployment_location_id BIGINT REFERENCES deployment_locations(id);
