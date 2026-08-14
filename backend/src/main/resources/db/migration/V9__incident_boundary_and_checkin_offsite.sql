-- Incident boundaries: an ordered polygon of lat/lng points the operator drops on a map,
-- distinct from the single-point `latitude`/`longitude` added in V8. Stored as JSONB (matching
-- the mesh_*_snapshots.raw_json convention) rather than a child table since it's always read/
-- written as one whole ordered list, never queried per-point.
ALTER TABLE incidents
    ADD COLUMN boundary_points JSONB;

-- Marks a deployed resource check-in as not physically located at the incident site (e.g. a
-- supernode/gateway node relaying from an operator's home) — distinct from having no
-- latitude/longitude at all, which just means "location unknown."
ALTER TABLE incident_resource_checkins
    ADD COLUMN off_site BOOLEAN NOT NULL DEFAULT false;
