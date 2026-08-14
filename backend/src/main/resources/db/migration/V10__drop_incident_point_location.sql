-- Incidents no longer have a single-point location — boundary_points (added in V9) is the only
-- location concept for an incident now, since a point can't represent an operating area.
ALTER TABLE incidents
    DROP COLUMN latitude,
    DROP COLUMN longitude;
