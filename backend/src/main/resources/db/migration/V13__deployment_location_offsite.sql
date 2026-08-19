-- Marks a deployment location as off-site (e.g. a supernode/gateway relaying from an operator's
-- home, not physically at the incident venue) — mirrors incident_resource_checkins.off_site
-- (V9), same rationale: distinct from having no coordinates at all.
ALTER TABLE deployment_locations
    ADD COLUMN off_site BOOLEAN NOT NULL DEFAULT false;
